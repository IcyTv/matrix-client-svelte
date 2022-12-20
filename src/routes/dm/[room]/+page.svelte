<script lang="ts">
	import { page } from '$app/stores';
	import Room from '$lib/components/Room.svelte';
	import Spinner from '$lib/components/Spinner.svelte';
	import { client } from '$lib/store';

	$: roomId = $page.params.room;
	$: room = $client.getRoom(roomId);
</script>

{#if !room}
	<div class="flex h-full w-full items-center justify-center">
		<Spinner />
	</div>
{:else}
	<div class="h-full w-full">
		{#key room.roomId}
			<Room {room} parentImage="" />
		{/key}
	</div>
{/if}
