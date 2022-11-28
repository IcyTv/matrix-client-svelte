<script lang="ts">
	import { page } from '$app/stores';
	import Room from '$lib/components/Room.svelte';
	import Spinner from '$lib/components/Spinner.svelte';
	import { client } from '$lib/store';

	$: roomId = $page.params.channel;
	$: parentRoomId = $page.params.room;

	$: room = $client.getRoom(roomId);

	$: parentRoomImage = $client.getRoom(parentRoomId)?.getAvatarUrl($client.baseUrl, 32, 32, 'crop');
</script>

<svelte:head>
	<title>Matrix: #{room?.name || 'Loading...'}</title>
</svelte:head>

{#if !room}
	<div class="flex h-full w-full items-center justify-center">
		<Spinner />
	</div>
{:else if room.isElementVideoRoom()}
	<!-- <JitsiConference {room} /> -->
{:else}
	{#key room.roomId}
		<Room {room} parentImage={parentRoomImage ?? ''} />
	{/key}
{/if}
