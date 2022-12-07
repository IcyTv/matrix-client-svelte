<script lang="ts">
	import { client } from '$lib/store';
	import OverflowMenuHorizontal from 'carbon-icons-svelte/lib/OverflowMenuHorizontal.svelte';
	import Reply from 'carbon-icons-svelte/lib/Reply.svelte';
	import UserAvatar from 'carbon-icons-svelte/lib/UserAvatar.svelte';
	import FaceAdd from 'carbon-icons-svelte/lib/FaceAdd.svelte';
	import EMOJI_REGEX from 'emojibase-regex/emoji';
	import { EventType, type MatrixEvent, type Room } from 'matrix-js-sdk';
	import Prism from 'prismjs';
	import 'prismjs/plugins/autoloader/prism-autoloader';
	import { afterUpdate, onDestroy, onMount } from 'svelte';
	import { createPopperActions } from 'svelte-popperjs';
	import Modal, { bind } from 'svelte-simple-modal';
	import { clickOutside } from 'svelte-use-click-outside';
	import { writable } from 'svelte/store';
	import _ from 'underscore';
	import '../../prism-one-dark.css';
	import EmojiPicker from './EmojiPicker.svelte';
	import ThreadIcon from './icons/ThreadIcon.svelte';
	import ImagePopup from './ImagePopup.svelte';
	import MessageInput from './MessageInput.svelte';
	import UserProfile from './UserProfile.svelte';
	import InfiniteLoading from 'svelte-infinite-loading';
	import Spinner from './Spinner.svelte';
	import DomPurify from 'dompurify';
	import { marked } from 'marked';
	import AllDone from './AllDone.svelte';
	import TopBar from '$lib/room/TopBar.svelte';
	import { formatDate, transformMessages } from '$lib/room/utils';
	import { fade } from 'svelte/transition';
	import VideoMessage from '$lib/room/VideoMessage.svelte';
	import { roomsCache, timelineCacheStore } from '$lib/room/stores';
	import MemberList from '$lib/room/MemberList.svelte';

	Prism.plugins.autoloader.languages_path = 'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/';
	Prism.manual = true;

	export let room: Room;
	export let parentImage: string;

	const ONLY_EMOJI_REGEX = new RegExp(`^(${EMOJI_REGEX.source})+$`);

	$: timelineStore = timelineCacheStore.getTimelineStore(room.roomId);
	$: {
		console.log('Refreshing timeline');
		timelineStore.refreshTimeline();
	}

	$: events = $timelineStore.firstVisibleEventIndex ? $timelineStore.events.slice($timelineStore.firstVisibleEventIndex) : $timelineStore.events;
	$: messages = transformMessages($client, events);

	let messagesContainer: HTMLElement;

	let emojiPicker: HTMLDivElement;

	afterUpdate(() => {
		Prism.highlightAll();
	});

	const modal = writable(null);

	const [userProfileRef, userProfileContent] = createPopperActions({
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
	});

	let userProfileId: string | null = null;
</script>

<div class="flex max-w-[calc(100%-16rem)] flex-grow flex-col">
	<TopBar {room} />

	<div class="flex max-h-[calc(100%-40px)] max-w-full flex-grow flex-row">
		<div class="relative flex max-h-full max-w-full flex-grow flex-col">
			<div bind:this={messagesContainer} class="flex max-h-full flex-grow flex-col scrollbar-thin scrollbar-thumb-slate-900 scrollbar-thumb-rounded-md" data-infinite-wrapper>
				<InfiniteLoading
					on:infinite={async (event) => {
						try {
							const isNotDone = await timelineStore.paginate(true);
							event.detail.loaded();

							if (isNotDone === false) {
								event.detail.complete();
							}
						} catch (err) {
							console.error('Error while paginating', err);
							event.detail.error();
						}
					}}
					direction="top"
					forceUseInfiniteWrapper
				>
					<div slot="spinner" class="m-4 flex justify-center">
						<Spinner />
					</div>

					<div slot="noResults">No results</div>
					<div slot="noMore"><AllDone roomName={room.name} /></div>
				</InfiniteLoading>
				{#each messages as eventGroup, groupIndex}
					{#if groupIndex === 0 || eventGroup.hasToShowDate}
						<div class="my-2 flex w-full flex-row items-center justify-center px-2 py-1 text-sm font-bold text-gray-400">
							<div class="mx-2 h-px flex-grow bg-gray-600" />
							<p class="w-fit">{formatDate(eventGroup.date)}</p>
							<div class="mx-2 h-px flex-grow bg-gray-600" />
						</div>
					{/if}
					<div class="flex w-full flex-col">
						{#each eventGroup.events as event, i (event.event.getId())}
							<div class="message-group group relative hover:bg-slate-800">
								{#if i == 0}
									<div
										class="inline-flex h-fit cursor-pointer select-none items-center justify-center active:scale-95"
										on:click={(e) => {
											if (!userProfileId) {
												userProfileId = eventGroup.sender;
											} else {
												userProfileId = null;
											}
											userProfileRef(e.currentTarget);
										}}
										on:keypress
									>
										{#if eventGroup.senderAvatar}
											<img class="mx-4 mt-2 h-10 w-10 rounded-full " src={eventGroup.senderAvatar} alt="Profile Pictore" />
										{:else}
											<UserAvatar class="mx-4 h-10 w-10 rounded-full" />
										{/if}
									</div>
								{:else}
									<div class="invisible flex items-center justify-center group-hover:visible">
										<p class="text-xs text-slate-400">{event.realTime}</p>
									</div>
								{/if}

								<div>
									{#if i == 0}
										<div class="flex flex-row items-center gap-4">
											<!-- svelte-ignore a11y-click-events-have-key-events -->
											<p
												style="color: {eventGroup.senderColor}"
												class="cursor-pointer py-1 font-bold hover:underline"
												on:click={(e) => {
													if (!userProfileId) {
														userProfileId = eventGroup.sender;
													} else {
														userProfileId = null;
													}
													userProfileRef(e.currentTarget);
												}}
											>
												{eventGroup.senderName ?? '<Unknown>'}
											</p>
											<p class="text-sm font-light text-slate-500 group-hover:hidden">{eventGroup.humanTime}</p>
											<p class="hidden text-sm font-light text-slate-500 group-hover:block">{event.realTime}</p>
										</div>
									{/if}
									{#if event.body.mimeType.startsWith('image/')}
										<img
											class="max-h-96 max-w-full cursor-pointer rounded"
											src={event.body.image}
											alt={event.body.text}
											on:click={() => {
												modal.set(bind(ImagePopup, { src: event.body.image, text: event.body.text }));
											}}
											on:keydown
										/>
									{:else if event.body.mimeType.startsWith('video/')}
										<VideoMessage {event} />
									{:else if ONLY_EMOJI_REGEX.test(event.body.text)}
										<p class="message-content w-full text-4xl">{event.body.text}</p>
									{:else}
										<p class="message-content w-full">
											{@html event.body.text}
											<!-- <span class=" invisible group-hover:visible absolute left-0">{event.humanTime}</span> -->
										</p>
									{/if}
								</div>

								<div
									class="absolute right-2 top-0 mx-2 hidden -translate-y-1/2 flex-row items-center justify-center overflow-clip rounded bg-slate-800 shadow shadow-black group-hover:flex"
								>
									<button
										on:click={(e) => {
											const rect = e.currentTarget.getBoundingClientRect();
											emojiPicker.style.left = `${rect.x}px`;
											emojiPicker.style.top = `${rect.y}px`;
											emojiPicker.classList.add('reaction-picker-open');
											emojiPicker.dataset.eventId = event.event.getId();

											const parent = e.currentTarget.parentElement?.parentElement;
											parent?.classList.add('message-group-active');
										}}
									>
										<FaceAdd class="message-action-button" />
									</button>
									<Reply class="message-action-button" />
									<ThreadIcon class="message-action-button" />
									<OverflowMenuHorizontal class="message-action-button" />
								</div>
							</div>
						{/each}
					</div>
				{/each}

				<InfiniteLoading
					on:infinite={async (event) => {
						try {
							const lastEvent = events[events.length - 1];
							if (!lastEvent) {
								console.log('No last event');
								setTimeout(() => {
									event.detail.loaded();
								}, 1000);
								return;
							} else {
								timelineStore.unpaginate(true, lastEvent.getId());
								event.detail.loaded();
							}
							// if (!isNotDone) event.detail.complete();
						} catch (e) {
							console.error(e);
							event.detail.error();
						}
					}}
					direction="bottom"
					forceUseInfiniteWrapper
				>
					<div slot="spinner" class="m-4 flex justify-center">
						<Spinner />
					</div>

					<div slot="noResults">No results</div>
				</InfiniteLoading>
			</div>

			<!-- TODO convert to popper -->
			<EmojiPicker
				on:click-outside={() => {
					emojiPicker.classList.remove('reaction-picker-open');
					document.querySelector('.message-group-active')?.classList.remove('message-group-active');
				}}
				on:emoji={(emoji) => {
					emojiPicker.classList.remove('reaction-picker-open');
					document.querySelector('.message-group-active')?.classList.remove('message-group-active');

					$client.sendEvent(room.roomId, EventType.Reaction, {
						'm.relates_to': {
							event_id: emojiPicker.dataset.eventId,
							key: emoji.detail.unicode,
							rel_type: 'm.annotation',
						},
					});
				}}
				bind:node={emojiPicker}
				class="fixed z-20 origin-right -translate-x-full -translate-y-1/2 scale-0 opacity-0 transition-[opacity,scale] duration-150 ease-in-out"
			/>

			<MessageInput
				on:submit={(msg) => {
					const htmlContent = marked.parseInline(msg.detail.content);
					const html = DomPurify.sanitize(htmlContent);
					$client.sendHtmlMessage(room.roomId, msg.detail.content, html).then((res) => {
						console.log(res);
						messagesContainer.scrollTo({
							behavior: 'smooth',
							top: messagesContainer.scrollHeight,
						});
					});
				}}
			/>
			<!-- active={messageInputActive} -->

			<!--TODO animate-->
			{#if userProfileId}
				<div id="user-profile-tooltip" use:userProfileContent use:clickOutside={() => (userProfileId = null)} transition:fade>
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
	.message-group {
		@apply grid pr-8;
		grid-template-columns: 5rem 1fr;
		overflow-anchor: none;
	}

	.message-content :global(pre) {
		@apply rounded;
	}

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
