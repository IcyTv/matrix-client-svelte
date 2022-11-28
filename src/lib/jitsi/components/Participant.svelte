<script lang="ts">
	import MicrophoneOffFilled from 'carbon-icons-svelte/lib/MicrophoneOffFilled.svelte';
	import ColorHash from 'color-hash';
	import Audio from './Audio.svelte';
	import Video from './Video.svelte';

	export let participant: any;
	export let focused: boolean = false;
	export let isSelf: boolean = false;

	const audioLevel = participant.audioLevelStore;

	const colorHash = new ColorHash({ saturation: 0.3, lightness: [0.5, 0.7] });

	$: color = colorHash.hex($participant.jid);

	$: muted = $participant.audioEnabled;
	// $: muted = $participant.audio?.isMuted();
	// $: console.log($participant.jid, $audioLevel);
</script>

<div
	class="relative my-4 ml-8 flex aspect-video h-min w-96 flex-grow flex-row overflow-clip rounded-lg"
	style="background-color: {color};"
	class:focused
	class:talking={$audioLevel > 0.01}
>
	{#if $participant.desktop}
		<Video track={$participant.desktop} mirror={$participant.isLocal} />
	{:else if $participant.video}
		<Video track={$participant.video} mirror={$participant.isLocal} />
	{:else if $participant.avatarUrl}
		<div class="flex h-full w-full items-center justify-center">
			<img src={$participant.avatarUrl} class="h-16 w-16 rounded-full" alt="Avatar" />
		</div>
	{/if}
	{#if $participant.audio && !isSelf}
		<Audio track={$participant.audio} />
	{/if}
	<p class="absolute bottom-2 left-2 rounded-lg bg-slate-800 bg-opacity-70 p-1 opacity-0 transition-all duration-200 group-hover:opacity-100">
		{$participant.displayName ?? 'You'}
	</p>
	<div class="absolute bottom-2 right-2 {muted ? 'hidden' : ''} rounded-full bg-slate-800 bg-opacity-70 p-2">
		<MicrophoneOffFilled class="" />
	</div>
</div>

<style>
	.focused {
		@apply w-full;
	}
	.talking {
		@apply ring-4 ring-green-700;
	}
</style>
