<script lang="ts">
	import { client } from '$lib/store';
	import { Close, UserAvatar, UserFollow } from 'carbon-icons-svelte';
	import { EventType, Room } from 'matrix-js-sdk';

	export let selectedRoomId: string = '';

	$: directMessageMap = $client.getAccountData(EventType.Direct)?.getContent() ?? {};
	$: directRooms = Object.entries(directMessageMap).map(([userId, roomIds]) => {
		return {
			userId,
			roomIds,
			user: $client.getUser(userId),
			rooms: roomIds.map((roomId: string) => $client.getRoom(roomId)) as Room[],
		};
	});

	let query: string;

	$: filteredDirectRooms = directRooms.filter((dm) => {
		if (!query) {
			return true;
		}
		const queryLower = query.toLowerCase();
		return dm.user?.displayName?.toLowerCase().includes(queryLower) || dm.user?.userId?.toLowerCase().includes(queryLower);
	});
</script>

<div class="flex flex-col">
	<div class="p-2 shadow shadow-slate-900">
		<input
			type="search"
			class="w-full rounded bg-slate-700 p-2 text-white focus:outline-none focus:ring-1 focus:ring-blue-600"
			placeholder="Search for friends"
			bind:value={query}
		/>
	</div>
	<a class="m-2 mt-4 flex flex-row items-center gap-2 rounded p-2 hover:bg-slate-600" href="/friends" class:bg-slate-700={selectedRoomId === 'friends'}>
		<UserFollow class="h-6 w-6" />
		<p>Friends</p>
	</a>
	<p class="mx-4 text-sm uppercase text-slate-400">Direct messages</p>
	{#each filteredDirectRooms as dm}
		{@const avatarUrl = $client.mxcUrlToHttp(dm.user?.avatarUrl ?? '', 32, 32, 'crop')}
		{#each dm.rooms as room, i}
			<a class="m-2 flex flex-row items-center gap-2 rounded p-2 hover:bg-slate-600" href="/dm/{room.roomId}" class:bg-slate-700={room.roomId === selectedRoomId}>
				{#if avatarUrl}
					<img src={avatarUrl} alt={dm.user?.displayName ?? ''} class="h-8 w-8 rounded-full" />
				{:else}
					<div class="h-10 w-10 rounded-full bg-gray-500">
						<UserAvatar class="h-10 w-10" />
					</div>
				{/if}
				<p>{dm.user?.displayName} {i !== 0 ? i : ''}</p>
				<div class="flex-grow" />
				<button class="text-slate-500 hover:text-white">
					<Close class="h-6 w-6" />
				</button>
			</a>
		{/each}
	{/each}
</div>
