<script lang="ts">
	import ScrollPanel from '$lib/components/ScrollPanel.svelte';
	import Spinner from '$lib/components/Spinner.svelte';
	import { timelineCacheStore } from '$lib/room/stores';
	import { EventType } from 'matrix-js-sdk';
	import { onDestroy, onMount } from 'svelte';

	const testRoomId = '!pRwROVpNIepCAVyihb:matrix.org';
	$: timelineStore = timelineCacheStore.getTimelineStore(testRoomId);
	$: paginationState = timelineStore.state;
	$: scrollPanelStore = timelineStore.scrollPanel;

	$: events = $timelineStore?.firstVisibleEventIndex ? $timelineStore?.events.slice($timelineStore.firstVisibleEventIndex) : $timelineStore?.events;
	$: console.log(events.length);

	let messagePanel: ScrollPanel;

	$: if (messagePanel) $scrollPanelStore = messagePanel;

	$: messageEvents = events.filter((e) => e.getType() === EventType.RoomMessage);
	// $: messageEvents = events;

	$: console.log(events, $timelineStore.liveEvents);

	onMount(() => {
		timelineStore.initTimeline();
	});
</script>

<div class="relative flex h-full min-h-0 flex-1 flex-col text-white">
	{#if timelineStore}
		<div class="flex h-full min-w-0 flex-1 basis-0 flex-col break-words">
			<ScrollPanel
				bind:this={messagePanel}
				onFillRequest={(backwards) => {
					return timelineStore.paginate(backwards);
				}}
				onUnfillRequest={(bw, scrollToken) => {
					return timelineStore.unpaginate(bw, scrollToken);
				}}
			>
				{#if $paginationState.paginationState.isBackPaginating}
					<Spinner />
				{/if}

				{#each messageEvents as event}
					<li class="m-8" data-scroll-tokens={event.getId()}>{JSON.stringify(event.getContent())}</li>
				{/each}

				{#if $paginationState.paginationState.isForwardPaginating}
					<Spinner />
				{/if}
			</ScrollPanel>
		</div>
	{:else}
		<p>Loading...</p>
	{/if}
</div>

<style>
	:global(.message-panel) {
		overflow-anchor: none;
	}

	.timeline {
		position: relative;
	}
</style>
