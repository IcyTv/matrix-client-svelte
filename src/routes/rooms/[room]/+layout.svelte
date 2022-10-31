<script lang="ts">
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { page } from '$app/stores';
	import { client } from '$lib/store';
	import Spinner from '$lib/components/Spinner.svelte';
	import ServerHeader from '$lib/components/ServerHeader.svelte';
	import type { Room } from 'matrix-js-sdk';
	import Hashtag from 'carbon-icons-svelte/lib/Hashtag.svelte';
	import UserSummary from '$lib/components/UserSummary.svelte';

	$: roomId = $page.params.room;
	$: room = $client?.getRoom(roomId);
	$: children = Promise.all(
		room?.currentState.getStateEvents('m.space.child')?.map((event) => {
			return $client?.getRoom(event.getStateKey());
		}) || []
	).then((rooms) => rooms.filter((room) => !!room)) as Promise<Room[]>;

	$: currentlySelected = $page.params.channel;
</script>

<Sidebar />

<div class="ml-16 flex h-full flex-row overflow-clip rounded-tl-xl bg-slate-700 text-white">
	{#if !room}
		<div class="flex h-full w-full items-center justify-center">
			<Spinner />
		</div>
	{:else}
		<div class="relative z-10 flex h-full w-64 flex-shrink-0 select-none flex-col bg-slate-800 shadow-lg shadow-black">
			<ServerHeader bind:room class="mb-4" />

			{#await children}
				<div class="h-8 rounded mx-2 mb-2 bg-slate-600 animate-pulse" />
				<div class="h-8 rounded mx-2 mb-2 bg-slate-600 animate-pulse" />
				<div class="h-8 rounded mx-2 mb-2 bg-slate-600 animate-pulse" />
				<div class="h-8 rounded mx-2 mb-2 bg-slate-600 animate-pulse" />
			{:then c}
				{#each c.filter((c) => !c.isSpaceRoom()) as child}
					<a
						class="flex flex-row items-center mx-2 mb-1 rounded shadow-slate-800 transition-all duration-75 cursor-pointer hover:bg-slate-700 hover:shadow 
							{currentlySelected == child.roomId ? 'bg-slate-700' : ''}"
						href={`/rooms/${roomId}/${child.roomId}`}
					>
						<Hashtag class="w-8 h-8 p-2" />
						<p>{child.name}</p>
					</a>
				{/each}
			{/await}

			<UserSummary />
		</div>

		<slot />
	{/if}
</div>
