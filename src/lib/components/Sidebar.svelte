<script lang="ts">
	import Add from 'carbon-icons-svelte/lib/Add.svelte';
	import Discover from 'carbon-icons-svelte/lib/Compass.svelte';
	import SidebarIcon from './SidebarIcon.svelte';
	import MatrixIcon from './icons/MatrixIcon.svelte';
	import { client, rootSpaces } from '$lib/store';
	import type { Room } from 'matrix-js-sdk';
	import { goto } from '$app/navigation';

	$: $client
		?.getJoinedRooms()
		.then((rooms) => {
			return Promise.all(rooms.joined_rooms.map((room: string) => $client?.getRoom(room)));
		})
		.then((rooms) => rooms.filter((room) => room?.currentState.getStateEvents('m.space.parent').length == 0 && room?.isSpaceRoom()) as Room[])
		// Sort rooms by the user defined order
		.then((rooms) => {
			if (rooms) {
				rootSpaces.set(rooms);
			}
		});
</script>

<div class="fixed inset-0 right-auto m-0 flex w-16 flex-col bg-gray-900 pt-8 text-white shadow-lg">
	<SidebarIcon tooltip="Direct Messages" on:click={() => goto('/')}><MatrixIcon /></SidebarIcon>
	<div class="mx-auto h-0.5 w-12 rounded-lg bg-gray-700" />

	{#if rootSpaces}
		{#if $rootSpaces.length == 0}
			<div class="sidebar-icon animate-pulse bg-slate-600" />
			<div class="sidebar-icon animate-pulse bg-slate-600" />
			<div class="sidebar-icon animate-pulse bg-slate-600" />
			<div class="sidebar-icon animate-pulse bg-slate-600" />
			<div class="sidebar-icon animate-pulse bg-slate-600" />
		{:else}
			{#each $rootSpaces as space}
				<a href="/rooms/{space.roomId}">
					<SidebarIcon initials={space.name} tooltip={space.name}>
						{#if space.getAvatarUrl('https://matrix.org', 32, 32, 'scale')}
							<img src={space.getAvatarUrl('https://matrix.org', 32, 32, 'scale')} alt={space.name} />
						{/if}
					</SidebarIcon>
				</a>
			{/each}
		{/if}
	{/if}

	<SidebarIcon tooltip="Create Space"><Add /></SidebarIcon>
	<SidebarIcon tooltip="Discover Spaces"><Discover /></SidebarIcon>
</div>
