<script lang="ts">
	import type JitsiTrack from '@solyd/lib-jitsi-meet/dist/esm/modules/RTC/JitsiTrack';
	import { onMount, afterUpdate, onDestroy } from 'svelte';
	import { v4 as uuidv4 } from 'uuid';
	import { createElementAndTrackStore } from '../elementTrackStore';

	export let id = uuidv4();
	export let loop = false;
	export let autoplay = true;
	export let track: JitsiTrack | null = null;

	let audioElement: HTMLAudioElement;

	const store = createElementAndTrackStore();

	onMount(() => store.setElement(audioElement));
	afterUpdate(() => store.setTrack(track));

	onDestroy(store.destroy);
</script>

<!-- svelte-ignore a11y-media-has-caption -->
<audio bind:this={audioElement} {id} {loop} {autoplay} class="participant-audio" />
