<script lang="ts">
	import { client } from '$lib/store';
	import { EventType, MatrixEvent, RelationType, type Room } from 'matrix-js-sdk';
	import Prism from 'prismjs';
	import 'prismjs/plugins/autoloader/prism-autoloader';
	import { afterUpdate, onDestroy, onMount } from 'svelte';
	import { createPopperActions, type PopperOptions } from 'svelte-popperjs';
	import Modal, { bind } from 'svelte-simple-modal';
	import { clickOutside } from 'svelte-use-click-outside';
	import { writable } from 'svelte/store';
	import _ from 'underscore';
	import '../../prism-one-dark.css';
	import EmojiPicker from './EmojiPicker.svelte';
	import MessageInput from './MessageInput.svelte';
	import UserProfile from './UserProfile.svelte';
	import Spinner from './Spinner.svelte';
	import DomPurify from 'dompurify';
	import { marked } from 'marked';
	import AllDone from './AllDone.svelte';
	import TopBar from '$lib/room/TopBar.svelte';
	import { formatDate, transformMessages } from '$lib/room/utils';
	import { fade, scale } from 'svelte/transition';
	import { timelineCacheStore } from '$lib/room/stores';
	import MemberList from '$lib/room/MemberList.svelte';
	import ScrollPanel from './ScrollPanel.svelte';
	import { ChevronDown } from 'carbon-icons-svelte';
	import Message from '$lib/room/Message.svelte';

	Prism.plugins.autoloader.languages_path = 'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/';
	Prism.manual = true;

	export let room: Room;
	export let parentImage: string;

	$: timelineStore = timelineCacheStore.getTimelineStore(room.roomId);
	$: timelineState = timelineStore.state;

	onMount(() => {
		timelineStore.initTimeline();
	});

	let events: MatrixEvent[];
	$: events = $timelineStore.firstVisibleEventIndex ? $timelineStore.events.slice($timelineStore.firstVisibleEventIndex) : $timelineStore.events;
	$: events = events.filter((event) => !event.isRelation(RelationType.Replace));

	//TODO remove this...
	$: messages = transformMessages($client, events);

	let emojiPicker: HTMLDivElement;

	let replyingTo: MatrixEvent | undefined = undefined;

	afterUpdate(() => {
		Prism.highlightAll();
	});

	const modal = writable(null);

	const defaultPopper = {
		placement: 'right-start',
		strategy: 'fixed',
		modifiers: [
			{
				name: 'preventOverflow',
				options: {
					padding: 64,
					tether: true,
				},
			},
			{
				name: 'offset',
				options: {
					offset: [0, 8],
				},
			},
		],
	} as PopperOptions<any>;

	const [userProfileRef, userProfileContent] = createPopperActions(defaultPopper);

	const [emojiPickerRef, emojiPickerContent] = createPopperActions({
		...defaultPopper,
		placement: 'left',
	});
	let emojiPickerOpen = false;

	let userProfileId: string | null = null;

	let scrollPanel: ScrollPanel;

	const jumpToBottom = () => {
		timelineStore.jumpToLiveTimeline();
		scrollPanel.scrollToBottom();
	};
</script>

<div class="flex h-full w-full flex-grow flex-col">
	<TopBar {room} />

	<div class="flex h-[calc(100%-3em)] max-w-full flex-grow flex-row">
		<div class="relative flex max-h-full max-w-full flex-grow flex-col">
			<ScrollPanel onFillRequest={timelineStore.paginate} onUnfillRequest={timelineStore.unpaginate} bind:this={scrollPanel}>
				{#if !$timelineState.paginationState.isBackPaginating && !$timelineState.paginationState.canBackPaginate}
					<AllDone roomName={room.name} />
				{/if}

				{#if $timelineState.paginationState.isBackPaginating}
					<div class="flex w-full items-center justify-center" transition:fade|local>
						<Spinner />
					</div>
				{/if}

				{#each messages as eventGroup, groupIndex}
					{#if groupIndex === 0 || eventGroup.hasToShowDate}
						<div class="my-2 flex w-full flex-row items-center justify-center px-2 py-1 text-sm font-bold text-gray-400">
							<div class="mx-2 h-px flex-grow bg-gray-600" />
							<p class="w-fit">{formatDate(eventGroup.date)}</p>
							<div class="mx-2 h-px flex-grow bg-gray-600" />
						</div>
					{/if}
					{#each eventGroup.events as event, i (event.event.getId())}
						<Message
							modalStore={modal}
							event={event.event}
							isFirst={i === 0}
							timelineSet={room.getUnfilteredTimelineSet()}
							on:senderClick={(e) => {
								if (!userProfileId) {
									userProfileId = eventGroup.sender;
								} else {
									userProfileId = null;
								}
								userProfileRef(e.detail.originalEvent.currentTarget);
							}}
							on:emojiClick={(e) => {
								emojiPickerRef(e.detail.target);
								emojiPickerOpen = true;
								setTimeout(() => {
									emojiPicker.dataset.eventId = event.event.getId();
								});
							}}
							on:redactReaction={(e) => {
								// $client.redactEvent(event.event.getRoomId() ?? '', event.event.getId());
								if (e.detail.reactionEvent) {
									$client.redactEvent(event.event.getRoomId() ?? '', e.detail.reactionEvent.getId());
								} else {
									//TODO send reaction? Technically this should be handled by the message itself...
								}
							}}
							on:reply={() => (replyingTo = event.event)}
						/>
					{/each}
					<!-- </div> -->
				{/each}

				{#if $timelineState.paginationState.isForwardPaginating}
					<div class="flex w-full items-center justify-center" transition:fade|local>
						<Spinner />
					</div>
				{/if}
			</ScrollPanel>

			{#if scrollPanel && !scrollPanel.isAtBottom()}
				<button class="absolute bottom-24 right-4 rounded-full bg-slate-600" transition:fade|local on:click={jumpToBottom}>
					<ChevronDown class="h-6 w-6" />
				</button>
			{/if}

			<!-- TODO convert to popper -->
			{#if emojiPickerOpen}
				<div use:emojiPickerContent transition:fade|local>
					<EmojiPicker
						on:click-outside={() => {
							emojiPickerOpen = false;
						}}
						on:emoji={(emoji) => {
							emojiPickerOpen = false;

							$client.sendEvent(room.roomId, EventType.Reaction, {
								'm.relates_to': {
									event_id: emojiPicker.dataset.eventId,
									key: emoji.detail.unicode,
									rel_type: 'm.annotation',
								},
							});
						}}
						bind:node={emojiPicker}
						class="z-20 origin-right"
					/>
				</div>
			{/if}

			<MessageInput
				on:submit={(msg) => {
					const htmlContent = marked.parseInline(msg.detail.content);
					const html = DomPurify.sanitize(htmlContent);

					if (!replyingTo) {
						$client.sendHtmlMessage(room.roomId, msg.detail.content, html).then((res) => {
							console.log(res);
							jumpToBottom();
						});
					} else {
						$client
							.sendEvent(room.roomId, EventType.RoomMessage, {
								'm.relates_to': {
									'm.in_reply_to': {
										event_id: replyingTo.getId(),
									},
								},
								msgtype: 'm.text',
								body: msg.detail.content,
								format: 'org.matrix.custom.html',
								formatted_body: html,
							})
							.then((res) => {
								console.log(res);
								jumpToBottom();
								replyingTo = undefined;
							});
					}
				}}
				bind:replyingTo
			/>

			{#if userProfileId}
				<div id="user-profile-tooltip" use:userProfileContent use:clickOutside={() => (userProfileId = null)} transition:fade|local>
					<UserProfile userId={userProfileId} {room} roomImage={parentImage} />
				</div>
			{/if}

			<Modal
				classBg="bg-black bg-opacity-70 z-30 fixed inset-0 flex flex-col justify-center items-center cursor-pointer"
				classWindowWrap="relative m-2 max-h-full w-fit"
				classWindow="w-fit"
				classContent="flex flex-col items-center justify-center p-0 relative bg-transparent text-white cursor-default"
				closeButton={false}
				unstyled
				closeOnEsc
				closeOnOuterClick
				on:close={() => ($modal = null)}
				show={$modal}
			/>
		</div>

		<MemberList
			{room}
			on:memberClick={(ev) => {
				userProfileId = ev.detail.userId;
				userProfileRef(ev.detail.element);
			}}
		/>
	</div>
</div>

<style>
	:global(.fullsize-img) {
		@apply scale-100 opacity-100;
	}

	/*TODO figure out why this doesn't work... */
	:global(.message-action-button) {
		@apply h-8 w-8 cursor-pointer p-2 text-gray-400 hover:bg-slate-700;
	}

	:global(.reaction-picker-open) {
		@apply scale-100 opacity-100;
	}

	:global(.message-group-active) {
		@apply bg-slate-800;
	}

	:global(.message-group-active) > div:last-child {
		@apply flex;
	}

	:global(mx-reply) {
		@apply hidden;
	}

	:global(.fullsize-img) {
		@apply fixed inset-0 z-10 h-screen w-screen;
		overflow-anchor: none;
	}
</style>
