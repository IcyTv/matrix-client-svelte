import { derived, writable, get, type Writable, type Readable } from 'svelte/store';
import { createParticipantsStore, createSingleParticipantStore } from './participantsStore';
import { trackDirection, wireEventListeners, type JitsiEvents } from '$lib/utils/events';
import { omit } from 'underscore';
import { localTracksStore } from './localTrackStores';
import { addLocalTracksToConference } from './tracks';
import type JitsiParticipant from '@solyd/lib-jitsi-meet/dist/esm/JitsiParticipant';
import type JitsiTrack from '@solyd/lib-jitsi-meet/dist/esm/modules/RTC/JitsiTrack';
import type JitsiConnection from '@solyd/lib-jitsi-meet/dist/esm/JitsiConnection';
import type JitsiConference from '@solyd/lib-jitsi-meet/dist/esm/JitsiConference';

const CLEANUP_EVENT_LISTENERS_MAX_TIMEOUT = 4000;

export enum ConferenceState {
	INITIAL = 'initial',
	JOINING = 'joining',
	JOINED = 'joined',
	LEAVING = 'leaving',
	LEFT = 'left',
	FAILED = 'failed',
	ERROR = 'error',
	KICKED = 'kicked',
}

export interface SingleConferenceStore {
	subscribe: Writable<JitsiConference>['subscribe'];
	state: Writable<ConferenceState>;
	localParticipant: any;
	participants: Readable<any[]>;
	permitEntry: (permit: boolean) => void;
	leave: () => Promise<void>;
}

function createSingleConferenceStore(conferenceId: string, connectionStore: Writable<JitsiConnection | null>): SingleConferenceStore {
	const stateStore = writable(ConferenceState.INITIAL);
	const permitEntryStore = writable(false);
	const localParticipantStore = createSingleParticipantStore(true);
	const remoteParticipantsStore = createParticipantsStore();

	let localParticipantId: string | null = null;
	localParticipantStore.subscribe(($localParticipant) => (localParticipantId = $localParticipant.jid));

	const cachedTrackParticipantId = new WeakMap();

	const store = derived(
		connectionStore,
		($connection, set) => {
			if ($connection) {
				const conference = $connection.initJitsiConference(conferenceId, {
					// per latest recommendation:
					// https://community.jitsi.org/t/sctp-channels-deprecation-use-websockets/79408/8
					openBridgeChannel: 'websocket',
				});

				const setStatus = (state: ConferenceState) => {
					switch (state) {
						case ConferenceState.JOINING:
							localParticipantStore.setJid(conference.myUserId());
							break;
						case ConferenceState.JOINED:
							set(conference);
							break;
						default:
							set(null);
					}
					stateStore.set(state);
				};

				const addRemoveTrack = (track: JitsiTrack, direction: 'add' | 'remove') => {
					const fnName = trackDirection(direction);
					let pId = (track as any).getParticipantId();
					if (!pId) {
						pId = cachedTrackParticipantId.get(track);
					}
					if (pId) {
						cachedTrackParticipantId.set(track, pId);
						remoteParticipantsStore.updateParticipant(pId, (pStore) => {
							pStore[fnName](track);
						});
					} else {
						console.warn('no participant id for track', track);
					}
				};

				const events: JitsiEvents = {
					conference: {
						CONFERENCE_JOINED: () => {
							setStatus(ConferenceState.JOINED);
						},
						CONFERENCE_LEFT: () => {
							wireEventListeners('remove', conference, events);
							setStatus(ConferenceState.LEFT);
						},
						CONFERENCE_FAILED: () => {
							console.error('conference failed', conference);
							setStatus(ConferenceState.FAILED);
						},
						CONFERENCE_ERROR: (errorCode: string) => {
							console.error('Jitsi conference error', errorCode);
							setStatus(ConferenceState.ERROR);
						},
						KICKED: () => setStatus(ConferenceState.KICKED),

						USER_JOINED: (pId: string, participant: JitsiParticipant) => {
							remoteParticipantsStore.updateParticipant(pId, (pStore) => {
								pStore.updateFieldsFromJitsiParticipant(participant);
								// for (const track of participant.getTracks()) {
								// 	console.log('Adding track for participant', pId, track);
								// 	pStore.addTrack(track);
								// }
							});
						},
						USER_LEFT: (pId: string) => {
							remoteParticipantsStore.update(($store) => omit($store, pId));
						},
						USER_ROLE_CHANGED: (pId: string, role: string) => {
							if (pId === localParticipantId) {
								localParticipantStore.setRole(role);
							} else {
								remoteParticipantsStore.updateParticipant(pId, (pStore) => {
									pStore.setRole(role);
								});
							}
						},
						TRACK_ADDED: (track: JitsiTrack) => addRemoveTrack(track, 'add'),
						TRACK_REMOVED: (track: JitsiTrack) => addRemoveTrack(track, 'remove'),

						DISPLAY_NAME_CHANGED: (pId: string, displayName: string) => {
							if (pId === localParticipantId) {
								localParticipantStore.setDisplayName(displayName);
							} else {
								remoteParticipantsStore.updateParticipant(pId, (pStore) => {
									pStore.setDisplayName(displayName);
								});
							}
						},
					},
				};

				wireEventListeners('add', conference, events);

				conference.addCommandListener('avatar-url', ((event: any, pId: string, userId: string) => {
					const avatarUrl = event.value;
					if (pId === localParticipantId) {
						localParticipantStore.setAvatarUrl(avatarUrl);
					} else {
						remoteParticipantsStore.updateParticipant(pId, (pStore) => {
							pStore.setAvatarUrl(avatarUrl);
						});
					}
				}) as any);

				setStatus(ConferenceState.JOINING);
				//TODO we really should create our own typings for this, since here it EXPECTS a pw.... etc.
				// @ts-ignore
				conference.join();

				// When connection status changes, clean up before re-creating a new JitsiConference
				return () => {
					const cleanupListeners = () => {
						wireEventListeners('remove', conference, events);
						//@ts-ignore
						conference.removeCommandListener('avatar-url');
					};

					const $state = get(stateStore);
					if ($state === ConferenceState.JOINED || $state === ConferenceState.JOINING) {
						const $connection = get(connectionStore);
						if ($connection) {
							setStatus(ConferenceState.LEAVING);
							conference
								?.leave()
								.then(() => {
									console.log('conference left', conferenceId);
								})
								.catch((err: any) => {
									setStatus(ConferenceState.LEFT);
									console.warn('Error when leaving conference', err);
								});

							/**
							 * Make sure we clean up event listeners.
							 *
							 * NOTE: Hopefully this will have been taken care of by
							 *       the CONFERENCE_LEFT event, but if not this will
							 *       be our fallback, e.g. in the case of
							 *       CONFERENCE_FAILED or other states.
							 */
							setTimeout(cleanupListeners, CLEANUP_EVENT_LISTENERS_MAX_TIMEOUT);
						} else {
							setStatus(ConferenceState.LEFT);
							cleanupListeners();
						}
					} else {
						// Whether or not we're joined, we must still clean up event listeners
						setStatus(ConferenceState.LEFT);
						cleanupListeners();
					}
				};
			} else {
				console.warn("No connection, can't join conference");
			}
		},
		null as any
	);

	derived([store, localTracksStore, permitEntryStore], ([$store, $localTracks, $permitEntry]) => {
		return {
			conference: $store,
			tracks: $localTracks,
			permitEntry: $permitEntry,
		};
	}).subscribe(($props) => {
		if ($props.conference && $props.tracks && $props.permitEntry) {
			// Whenever local tracks exist, add them to the localParticipant for this conference
			// (Allows this participant to see self)
			localParticipantStore.addTrack($props.tracks.audio);
			localParticipantStore.addTrack($props.tracks.video);
			// When conference & local tracks exist, add local tracks to the conference
			// (Allows others to see this participant)
			const tracksList = Object.values($props.tracks);
			addLocalTracksToConference($props.conference, tracksList);
		} else {
			//TODO remove local tracks?
		}
	});

	/**
	 * A store containing all participant stores, both local and remote.
	 *
	 * This derives from `store` because we need to guarantee that there is
	 * at least one subscriber to `store`, so that the conference is joined.
	 */
	const allParticipantsStore = derived(
		[localParticipantStore, remoteParticipantsStore, store],
		([$localParticipant, $remoteParticipants, $store], set) => {
			if ($store) {
				//TODO remove any here
				const allParticipants: any = {};

				for (let [participantId, remoteParticipantStore] of Object.entries($remoteParticipants)) {
					if (get(remoteParticipantStore).jid) {
						allParticipants[participantId] = remoteParticipantStore;
					}
				}

				// Add local participant, if present
				if ($localParticipant && $localParticipant.jid) {
					allParticipants[$localParticipant.jid] = localParticipantStore;
				}

				set(allParticipants);
			} else {
				set({});
			}
		},
		//TODO remove any
		{} as any
	);

	return {
		subscribe: store.subscribe,
		state: stateStore,
		localParticipant: localParticipantStore,
		participants: allParticipantsStore,
		permitEntry: (permit: boolean) => {
			permitEntryStore.set(permit);
		},
		leave: async () => {
			await get(store)?.leave();
		},
	};
}

export function createConferencesStore(connectionStore: Writable<JitsiConnection | null>) {
	const store = writable<{
		[conferenceId: string]: ReturnType<typeof createSingleConferenceStore>;
	}>({});

	const { subscribe, set, update } = store;

	const join = (conferenceId: string) => {
		update(($store) => {
			return {
				...$store,
				[conferenceId]: createSingleConferenceStore(conferenceId, connectionStore),
			};
		});
	};

	const leave = (conferenceId: string) => {
		update(($store) => {
			const conferenceStore = $store[conferenceId];
			if (conferenceStore) {
				// TODO do we need to deinit more?
				conferenceStore.leave();
			}
			return omit($store, conferenceId);
		});
	};

	return { subscribe, join, leave };
}
