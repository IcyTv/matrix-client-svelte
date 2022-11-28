<script lang="ts">
	import type JitsiTrack from '@solyd/lib-jitsi-meet/dist/esm/modules/RTC/JitsiTrack';
	import { onMount, afterUpdate, onDestroy } from 'svelte';
	import { v4 as uuidv4 } from 'uuid';
	import { createElementAndTrackStore } from '../elementTrackStore';

	export let id = uuidv4();
	export let autoplay = true;
	export let fullscreen = false;
	export let playsinline = true;
	export let track: JitsiTrack | null = null;
	export let mirror = false;

	let clazz = '';
	export { clazz as class };

	let videoElement: HTMLVideoElement;

	const store = createElementAndTrackStore();

	onMount(() => store.setElement(videoElement));
	afterUpdate(() => store.setTrack(track));

	onDestroy(store.destroy);
</script>

<!-- svelte-ignore a11y-media-has-caption -->
<video class="h-full w-full object-cover {clazz}" bind:this={videoElement} class:mirror class:fullscreen {id} {autoplay} {playsinline} disablePictureInPicture />

<style>
	.mirror {
		@apply -scale-x-100;
	}

	.fullscreen {
		@apply h-full w-full;
	}
</style>
