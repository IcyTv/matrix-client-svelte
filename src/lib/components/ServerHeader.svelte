<script lang="ts">
	import type { Room } from 'matrix-js-sdk';
	import ChevronDown from 'carbon-icons-svelte/lib/ChevronDown.svelte';
	import { clickOutside } from 'svelte-use-click-outside';
	import { ChevronUp, Settings, UserFollow } from 'carbon-icons-svelte';
	import { scale } from 'svelte/transition';

	export let room: Room;

	let clazz: string;
	export { clazz as class };

	let isOpen = false;
</script>

<button
	class="relative flex cursor-pointer items-center justify-between p-2 pl-4 text-lg font-bold shadow-[0_2px_2px_-1px] shadow-slate-900 hover:bg-slate-700 {clazz}"
	class:bg-slate-700={isOpen}
	on:click={() => (isOpen = !isOpen)}
	use:clickOutside={() => (isOpen = false)}
>
	{room.name}
	{#if isOpen}
		<ChevronUp />
	{:else}
		<ChevronDown />
	{/if}

	{#if isOpen}
		<div class="server-dropdown absolute -bottom-4 left-0 right-0 flex origin-top translate-y-full flex-col rounded bg-slate-900 text-base font-light" transition:scale>
			<button class="mx-1 flex items-center justify-between rounded px-3 py-2 text-violet-300 hover:bg-violet-600 hover:text-white">
				<p>Invite people</p>
				<UserFollow />
			</button>
			<button class="mx-1 flex items-center justify-between rounded px-3 py-2 hover:bg-indigo-700 hover:text-white">
				<p>Settings</p>
				<Settings />
			</button>
		</div>
	{/if}
</button>

<style>
	.server-dropdown {
		--padding: 1rem;
		width: calc(100% - var(--padding) * 2);
		margin-right: var(--padding);
		margin-left: var(--padding);
	}
</style>
