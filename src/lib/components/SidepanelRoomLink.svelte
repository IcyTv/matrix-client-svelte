<script lang="ts">
	import { Hashtag, VolumeUpFilled } from 'carbon-icons-svelte';
	import type { Room } from 'matrix-js-sdk';
	import { createEventDispatcher } from 'svelte';

	let clazz: string = '';
	export { clazz as class };

	export let room: Room;
	export let currentlySelected = false;

	const dispatch = createEventDispatcher();
</script>

<a
	class="mx-2 mb-1 flex cursor-pointer flex-row items-center rounded shadow-slate-800 transition-all duration-75 hover:bg-slate-700 hover:shadow {clazz}"
	href="/rooms/{room.roomId}"
	class:bg-slate-700={currentlySelected}
	on:click={(ev) => dispatch('channel-click', ev)}
>
	{#if room.isCallRoom() || room.isElementVideoRoom()}
		<VolumeUpFilled class="h-8 w-8 p-2" />
	{:else}
		<Hashtag class="h-8 w-8 p-2" />
	{/if}
	<p>{room.name}</p>
</a>
