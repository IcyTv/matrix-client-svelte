import { derived, writable, get, type Writable } from 'svelte/store';
import { omit } from 'underscore';
import { wireEventListeners, type JitsiEvents } from '$lib/utils/events';
import type { MediaType } from '@solyd/lib-jitsi-meet/dist/esm/service/RTC/MediaType';
import type JitsiTrack from '@solyd/lib-jitsi-meet/dist/esm/modules/RTC/JitsiTrack';
import type JitsiParticipant from '@solyd/lib-jitsi-meet/dist/esm/JitsiParticipant';

interface ParticipantFields {
	jid: string | null;
	role: string | null;

	audioEnabled: boolean;
	videoEnabled: boolean;
	desktopEnabled: boolean;

	isLocal: boolean;
	displayName: string | null;
	avatarUrl: string | null;
}

type TrackStoreType = {
	[key in MediaType]?: any;
};

export function createSingleParticipantStore(isLocal = true) {
	const fieldsStore = writable<ParticipantFields>({
		jid: null,
		role: null,

		audioEnabled: false,
		videoEnabled: false,
		desktopEnabled: false,

		isLocal: false,
		displayName: null,
		avatarUrl: null,
	});

	const tracksStore = writable<TrackStoreType>({});
	const audioLevelStore = writable<number>(0);

	const store = derived<[Writable<ParticipantFields>, Writable<TrackStoreType>, Writable<number>], ParticipantFields & TrackStoreType & { audioLevel: number }>(
		[fieldsStore, tracksStore, audioLevelStore],
		([$fields, $tracks, $audioLevel], set) => {
			set({
				...$fields,
				...$tracks,
				audioLevel: $audioLevel,
			});
		}
	);

	const events: { [key in MediaType]?: JitsiEvents } = {
		audio: {
			track: {
				TRACK_AUDIO_LEVEL_CHANGED: (level: number) => {
					audioLevelStore.set(level);
				},
				//TODO fix types
				TRACK_MUTE_CHANGED: (track: any) => {
					console.log('track mute changed', track);
					fieldsStore.update(($fields) => ({ ...$fields, audioEnabled: !track.isMuted() }));
				},
			},
		},
		video: {
			track: {
				TRACK_MUTE_CHANGED: (track: any) => {
					fieldsStore.update(($fields) => ({ ...$fields, videoEnabled: !track.isMuted() }));
				},
			},
		},
	};

	return {
		subscribe: store.subscribe,

		setJid: (jid: string | null) => fieldsStore.update(($fields) => ({ ...$fields, jid })),
		setRole: (role: string | null) => fieldsStore.update(($fields) => ({ ...$fields, role })),

		setAudioEnabled: (enabled: boolean) => {
			const tracks = get(tracksStore);
			if (tracks.audio) {
				if (enabled) {
					tracks.audio.unmute();
				} else {
					tracks.audio.mute();
				}
			}
		},
		setVideoEnabled: (enabled: boolean) => {
			const tracks = get(tracksStore);
			if (tracks.video) {
				if (enabled) {
					tracks.video.unmute();
				} else {
					tracks.video.mute();
				}
			}
		},
		setAudioLevel: (level: number) => audioLevelStore.set(level),

		updateFieldsFromJitsiParticipant: (jitsiParticipant: JitsiParticipant) => {
			fieldsStore.update(($fields) => ({
				...$fields,
				jid: jitsiParticipant.getId(),
				role: jitsiParticipant.getRole(),
				displayName: jitsiParticipant.getDisplayName(),
			}));
		},

		addTrack: (track?: JitsiTrack) => {
			if (track) {
				const trackType = track.getType();
				if (events[trackType]) {
					wireEventListeners('add', track as any, events[trackType]!);
				} else {
					console.warn("Can't listen to events", trackType);
				}
				fieldsStore.update(($fields) => ({ ...$fields, [`${trackType}Enabled`]: !(track as any).isMuted() }));
				tracksStore.update(($tracks) => ({ ...$tracks, [trackType]: track }));

				console.log('addTrack', trackType, track, get(fieldsStore), get(tracksStore));
			}
		},
		removeTrack: (track?: JitsiTrack) => {
			if (track) {
				const trackType = track.getType();
				if (events[trackType]) {
					wireEventListeners('remove', track as any, events[trackType]!);
				}
				tracksStore.update(($tracks) => omit($tracks, trackType));
			}
		},

		setDisplayName: (displayName: string | null) => fieldsStore.update(($fields) => ({ ...$fields, displayName })),
		setAvatarUrl: (avatarUrl: string | null) => fieldsStore.update(($fields) => ({ ...$fields, avatarUrl })),

		// Expose read-only versions of stores so they can be subscribed to individually
		fieldsStore: { subscribe: fieldsStore.subscribe },
		tracksStore: { subscribe: tracksStore.subscribe },
		audioLevelStore: { subscribe: audioLevelStore.subscribe },
	};
}

export function createParticipantsStore() {
	const store = writable<{
		[key: string]: ReturnType<typeof createSingleParticipantStore>;
	}>({});
	const { subscribe, set, update } = store;

	const updateParticipant = (participantId: string, action: (participant: ReturnType<typeof createSingleParticipantStore>, newParticipant: boolean) => void) => {
		let participant = get(store)[participantId];
		if (participant) {
			action(participant, false);
		} else {
			store.update(($participants) => {
				if ($participants[participantId]) {
					console.warn(`Participant ${participantId} should not exist here...`);
				}
				participant = createSingleParticipantStore();
				// participant.tracksStore.subscribe((tracks) => {
				// 	console.log('Tracks changed', tracks);
				// 	const events: { [key in MediaType]?: JitsiEvents } = {
				// 		audio: {
				// 			track: {
				// 				TRACK_MUTE_CHANGED: (track: any) => {
				// 					console.log(participantId, 'audio track mute changed', track.isMuted());
				// 					participant!.setAudioEnabled(!track.isMuted());
				// 				},
				// 				TRACK_AUDIO_LEVEL_CHANGED: (level: number) => {
				// 					console.log(participantId, 'Audio Level from participant update', level);
				// 					participant!.setAudioLevel(level);
				// 				},
				// 			},
				// 		},
				// 		video: {
				// 			track: {
				// 				TRACK_MUTE_CHANGED: (track: any) => {
				// 					participant!.setVideoEnabled(!track.isMuted());
				// 				},
				// 			},
				// 		},
				// 	};

				// 	if (tracks.audio) {
				// 		wireEventListeners('add', tracks.audio, events.audio!);
				// 	}
				// 	if (tracks.video) {
				// 		wireEventListeners('add', tracks.video, events.video!);
				// 	}

				// 	return () => {
				// 		if (tracks.audio) {
				// 			wireEventListeners('remove', tracks.audio, events.audio!);
				// 		}
				// 		if (tracks.video) {
				// 			wireEventListeners('remove', tracks.video, events.video!);
				// 		}
				// 	};
				// });
				action(participant, true);
				return {
					...$participants,
					[participantId]: participant,
				};
			});
		}
	};

	return {
		subscribe,
		set,
		update,
		updateParticipant,
	};
}
