<script lang="ts">
	import ThreadIcon from '$lib/components/icons/ThreadIcon.svelte';
	import { client } from '$lib/store';
	import {
		Hashtag,
		Help,
		Locked,
		MessageQueue,
		NotificationFilled,
		PinFilled,
		Search,
		UserMultiple,
		WatsonHealthStudyNext,
		WatsonHealthStudyPrevious,
	} from 'carbon-icons-svelte';
	import type { Room } from 'matrix-js-sdk';
	import { memberListIsOpen } from './stores';

	export let room: Room;

	$: isEncrypted = $client.isRoomEncrypted(room.roomId);
	$: topic = room.currentState.getStateEvents('m.room.topic', '')?.getContent()?.topic;

	$: UserElement = $memberListIsOpen ? WatsonHealthStudyNext : WatsonHealthStudyPrevious;
</script>

<div class="flex h-12 w-full max-w-full flex-row items-center bg-slate-700 p-2 shadow">
	<Hashtag class="ml-2 mr-1 flex-shrink-0 text-gray-400" />
	<h2 class="overflow-ellipsis whitespace-nowrap text-lg font-bold">{room.name}</h2>

	{#if isEncrypted}
		<Locked class="ml-2 text-green-700" />
	{/if}

	{#if topic}
		<div class="mx-2 h-4 w-px bg-gray-500" />
		<p class="flex-1 overflow-hidden overflow-ellipsis whitespace-nowrap pr-4 text-sm text-gray-400">{topic}</p>
	{/if}

	<ThreadIcon class="mx-1 ml-auto h-5 w-5 flex-shrink-0 text-gray-400" />
	<NotificationFilled class="mx-1 h-5 w-5 flex-shrink-0 text-gray-400" />
	<PinFilled class="mx-1 h-5 w-5 flex-shrink-0 text-gray-400" />
	<button class="mx-1" on:click={() => ($memberListIsOpen = !$memberListIsOpen)}>
		<!-- <UserMultiple class="h-5 w-5 flex-shrink-0 {$memberListIsOpen ? 'text-white' : 'text-gray-400'} hover:text-slate-200" /> -->
		<svelte:component this={UserElement} class="h-5 w-5 flex-shrink-0 {$memberListIsOpen ? 'text-white' : 'text-gray-400'} hover:text-slate-200" />
	</button>

	<div class="mx-2 flex flex-shrink flex-row items-center overflow-clip rounded bg-slate-900 px-2">
		<input class="min-w-0 bg-slate-900 text-white focus:outline-none" type="text" placeholder="Search" />
		<Search class="h-4 w-4 flex-shrink-0 text-gray-400" />
	</div>

	<MessageQueue class="mx-2 h-5 w-5 flex-shrink-0 text-gray-400" />
	<Help class="mx-2 h-5 w-5 flex-shrink-0 text-gray-400" />
</div>
