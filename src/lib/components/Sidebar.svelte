<script lang="ts">
	import Add from 'carbon-icons-svelte/lib/Add.svelte';
	import Discover from 'carbon-icons-svelte/lib/Compass.svelte';
	import SidebarIcon from './SidebarIcon.svelte';
	import MatrixIcon from './icons/MatrixIcon.svelte';
	import { client, isLoggedIn, rootSpaces } from '$lib/store';
	import type { Room } from 'matrix-js-sdk';
	import { goto } from '$app/navigation';

	let isLoading = true;
	$: $client?.getJoinedRooms().then((rooms) => {
		console.log('Got rooms', rooms);
		let rs = rooms.joined_rooms
			.map((room) => $client!.getRoom(room))
			.map((room) => {
				console.log(room);
				return room;
			})
			.filter((room) => room?.currentState.getStateEvents('m.space.parent').length === 0 && room?.isSpaceRoom()) as Room[];
		console.log('Got root spaces', rs);
		$rootSpaces = rs;
		isLoading = false;
	});

	$: console.log('Root spaces', $rootSpaces);
	const isTauri = (window as any).__TAURI__;
</script>

<div class="fixed inset-0 right-auto m-0 flex w-16 flex-col bg-gray-900 text-white shadow-lg" class:pt-8={isTauri}>
	<SidebarIcon tooltip="Direct Messages" on:click={() => goto('/')}><MatrixIcon /></SidebarIcon>
	<div class="mx-auto h-0.5 w-12 rounded-lg bg-gray-700" />

	{#if rootSpaces}
		{#if isLoading}
			<div class="sidebar-icon-skeleton" />
			<div class="sidebar-icon-skeleton" />
			<div class="sidebar-icon-skeleton" />
			<div class="sidebar-icon-skeleton" />
			<div class="sidebar-icon-skeleton" />
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
