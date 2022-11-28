import { derived, writable, get } from 'svelte/store';
import { selectedDevices as selectedDevicesStore, type SelectedDevices } from './deviceListStore';
import type { CreateLocalTracksOptions } from '@solyd/lib-jitsi-meet';
import type JitsiTrack from '@solyd/lib-jitsi-meet/dist/esm/modules/RTC/JitsiTrack';
import type { MediaType } from '@solyd/lib-jitsi-meet/dist/esm/service/RTC/MediaType';
import _ from 'underscore';
import type JitsiLocalTrack from '@solyd/lib-jitsi-meet/dist/esm/modules/RTC/JitsiLocalTrack';

const { TRACK_AUDIO_LEVEL_CHANGED } = JitsiMeetJS.events.track;

export const requestedTracks = {
	audio: writable(false),
	video: writable(false),
};

/**
 * Converts requestedTracks to a list of track names, e.g. ['audio', 'video']
 */
const requestedTrackNames = derived(
	[requestedTracks.audio, requestedTracks.video],
	([$audio, $video]) => [$audio ? 'audio' : null, $video ? 'video' : null].filter(Boolean) as string[],
	[]
);

export function createAudioLevelStore() {
	const { subscribe, set } = writable(0);

	/**
	 * Adds or removes an event listener function if the track is an audio track
	 *
	 * @param {JitsiTrack} track
	 * @param {string} direction - 'add' | 'remove'
	 */
	function changeAudioTrackEventListener(track: JitsiTrack, direction: 'add' | 'remove') {
		if (track.isAudioTrack()) {
			// TODO This is a hack for bad typings...
			//@ts-ignore
			track[`${direction}EventListener`](TRACK_AUDIO_LEVEL_CHANGED, set);
		}
		return track;
	}

	return {
		subscribe,
		set,
		initTrack: (track: JitsiTrack) => changeAudioTrackEventListener(track, 'add'),
		destroyTrack: (track: JitsiTrack) => changeAudioTrackEventListener(track, 'remove'),
	};
}

export const localAudioLevel = createAudioLevelStore();

type LocalTracks = {
	[key in MediaType]?: JitsiLocalTrack;
};

async function createLocalTracks(requestedTrackNames: string[], selectedDevices: SelectedDevices = {}) {
	let tracks: LocalTracks = {};

	const options: CreateLocalTracksOptions = { devices: requestedTrackNames };

	if (requestedTrackNames.includes('video') && selectedDevices.videoInput) {
		options.cameraDeviceId = selectedDevices.videoInput;
	}

	if (requestedTrackNames.includes('audio') && selectedDevices.audioInput) {
		options.micDeviceId = selectedDevices.audioInput;
	}

	try {
		for (const track of await JitsiMeetJS.createLocalTracks(options)) {
			if (typeof track === 'string') {
				throw new Error('Huh? ' + track);
			}
			tracks[track.getType()] = localAudioLevel.initTrack(track) as JitsiLocalTrack;
		}
	} catch (err) {
		console.error(err);
		if (requestedTrackNames.length > 1) {
			// If multiple tracks were requested, try again by requesting one at a time
			for (const trackName of requestedTrackNames) {
				try {
					Object.assign(
						tracks,

						await createLocalTracks([trackName], selectedDevices)
					);
				} catch (err2) {
					console.error("Couldn't create track", trackName, err2);
				}
			}
		} else {
			console.warn(`Unable to create local ${requestedTrackNames.join(', ')} track`);
		}
	}

	return tracks;
}

function createLocalTracksStore() {
	const store = writable<LocalTracks>({});
	const { subscribe, set, update } = store;

	function clear() {
		const tracks = get(store);

		for (const track of Object.values(tracks)) {
			localAudioLevel.destroyTrack(track);
		}

		set({});
	}

	return {
		subscribe,
		set,
		count: () => {
			return Object.values(get(store)).length;
		},
		/**
		 * Switch from sharing video to sharing desktop, or back if `desktop` is false.
		 */
		shareDesktop: async (desktop: boolean = true) => {
			const desktopTracks = await createLocalTracks([desktop ? 'desktop' : 'video']);
			update(($tracks) => {
				if ($tracks.video) {
					$tracks.video.dispose();
				}

				return _.omit($tracks, 'video');
			});

			setTimeout(() => {
				update(($tracks) => {
					return { ...$tracks, ...desktopTracks };
				});
				//TODO why?
			}, 1000);
		},

		/**
		 * Create multiple local tracks at once, or if error, create multiple
		 * local tracks one at a time. Takes into account `selectedDevices`
		 * setting that is "global" to this component.
		 *
		 * @param requestedTracks - a list of types of devices to allocate as tracks, e.g. ['video', 'audio']
		 *
		 * @returns - an object with keys equal to device types and values set to corresponding JitsiTrack
		 */
		request: async ({ requestedTracks, selectedDevices }: { requestedTracks?: string[]; selectedDevices?: SelectedDevices } = {}) => {
			if (!requestedTracks) {
				requestedTracks = get(requestedTrackNames);
			}
			if (!selectedDevices) {
				selectedDevices = get(selectedDevicesStore) ?? undefined;
			}

			const tracks = await createLocalTracks(requestedTracks, selectedDevices);

			clear();
			set(tracks);

			return Object.values(tracks).length > 0;
		},
		clear,
	};
}

export const localTracksStore = createLocalTracksStore();
