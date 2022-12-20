<script lang="ts">
	import { page } from '$app/stores';
	import { client, homeserverStore } from '$lib/store';
	import { Checkmark, Hashtag, VolumeUpFilled } from 'carbon-icons-svelte';
	import { EventType, Room, type IRoomSummary } from 'matrix-js-sdk';

	$: spaceId = $page.params.room;
	$: space = $client.getRoom(spaceId);

	$: children = space?.currentState
		.getStateEvents(EventType.SpaceChild)
		?.map((event) => {
			return $client.getRoom(event.getStateKey());
		})
		.filter((room) => !!room) as (Room | Promise<IRoomSummary>)[] | undefined;
	$: console.log(children);
</script>

<svelte:head>
	<title>Matrix: Space</title>
</svelte:head>

<div class="m-8 flex w-full flex-col">
	{#if children}
		{#each children as room}
			{#if room instanceof Room}
				{@const roomImage = room.getAvatarUrl($client.baseUrl, 64, 64, 'scale')}
				{@const roomTopic = room.currentState.getStateEvents(EventType.RoomTopic)[0]?.getContent().topic}
				{@const selfIsJoined = room.getMyMembership() === 'join'}
				<a class="flex w-full flex-row items-center gap-4 p-2" href="/rooms/{spaceId}/{room.roomId}">
					{#if roomImage}
						<img class="h-10 w-10 rounded-full" src={room.getAvatarUrl($client.baseUrl, 48, 48, 'scale')} alt="" />
					{:else if room.isElementVideoRoom()}
						<div class="flex h-10 w-10 items-center justify-center rounded-full bg-slate-600 text-3xl uppercase"><VolumeUpFilled class="text-white" /></div>
					{:else}
						<div class="flex h-10 w-10 items-center justify-center rounded-full bg-slate-600 text-3xl uppercase"><Hashtag class="text-white" /></div>
					{/if}
					<div class="grid flex-grow grid-cols-2">
						<h2 class="text-lg">{room.name}</h2>
						{#if selfIsJoined}
							<div class="flex flex-row items-center justify-end">
								<Checkmark class="text-green-400" />
								<p class="text-sm text-gray-400">Joined</p>
							</div>
						{:else}
							<button class="text-sm text-gray-400">Join</button>
						{/if}
						<p class="col-span-2 text-sm text-gray-400">{room.getMembers().length} member(s) {roomTopic ? `- ${roomTopic}` : ''}</p>
					</div>
				</a>
			{/if}
		{/each}
	{/if}
</div>
