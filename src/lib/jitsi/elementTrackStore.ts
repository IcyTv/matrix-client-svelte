import type JitsiTrack from '@solyd/lib-jitsi-meet/dist/esm/modules/RTC/JitsiTrack';
import { writable, derived, get } from 'svelte/store';

export function createElementAndTrackStore() {
	let attachedTrack: JitsiTrack | null = null;

	const elementStore = writable<HTMLElement | null>(null);
	const trackStore = writable<JitsiTrack | null>(null);

	const detach = () => {
		const element = get(elementStore);
		if (attachedTrack) {
			attachedTrack.detach(element!);
			attachedTrack = null;
		}
	};

	const attach = () => {
		const track = get(trackStore);
		const element = get(elementStore);
		if (track && track !== attachedTrack) {
			detach();
			attachedTrack = track;
			track.attach(element!);
		}
	};

	const store = derived([elementStore, trackStore], ([$element, $track]) => {
		return {
			element: $element,
			track: $track,
		};
	});

	const unsubscribe = store.subscribe(($props) => {
		if ($props.element && $props.track) {
			attach();
		}
	});

	return {
		subscribe: store.subscribe,

		destroy: () => {
			detach();
			unsubscribe();
		},

		setElement(element: HTMLElement | null) {
			elementStore.set(element);
		},

		setTrack(track: JitsiTrack | null) {
			if (track != get(trackStore)) {
				trackStore.set(track);
			}
		},
	};
}
