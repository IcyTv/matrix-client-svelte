<script lang="ts">
	import { client } from '$lib/store';
	import RelativeTime from '@yaireo/relative-time';
	import Hashtag from 'carbon-icons-svelte/lib/Hashtag.svelte';
	import Help from 'carbon-icons-svelte/lib/Help.svelte';
	import Locked from 'carbon-icons-svelte/lib/Locked.svelte';
	import MessageQueue from 'carbon-icons-svelte/lib/MessageQueue.svelte';
	import NotificationFilled from 'carbon-icons-svelte/lib/NotificationFilled.svelte';
	import OverflowMenuHorizontal from 'carbon-icons-svelte/lib/OverflowMenuHorizontal.svelte';
	import PinFilled from 'carbon-icons-svelte/lib/PinFilled.svelte';
	import PlayFilled from 'carbon-icons-svelte/lib/PlayFilled.svelte';
	import Reply from 'carbon-icons-svelte/lib/Reply.svelte';
	import Search from 'carbon-icons-svelte/lib/Search.svelte';
	import UserAvatar from 'carbon-icons-svelte/lib/UserAvatar.svelte';
	import UserMultiple from 'carbon-icons-svelte/lib/UserMultiple.svelte';
	import FaceAdd from 'carbon-icons-svelte/lib/FaceAdd.svelte';
	import ColorHash from 'color-hash';
	import EMOJI_REGEX from 'emojibase-regex/emoji';
	import { Direction, EventTimeline, EventType, type IEventWithRoomId, type MatrixEvent, type Room } from 'matrix-js-sdk';
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
	import { Gesture, Media, MediaSync, MediaVisibility, PlayButton, Poster, Video } from '@vidstack/player-svelte';
	import InfiniteLoading from 'svelte-infinite-loading';
	import Spinner from './Spinner.svelte';
	import DomPurify from 'dompurify';
	import { marked } from 'marked';
	import WebRtcCallButton from './WebRTCCallButton.svelte';
	import AllDone from './AllDone.svelte';

	Prism.plugins.autoloader.languages_path = 'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/';
	Prism.manual = true;

	export let room: Room;
	export let parentImage: string;

	const ONLY_EMOJI_REGEX = new RegExp(`^(${EMOJI_REGEX.source})+$`);

	const MAX_TIMESTAMP_DIFF = 5 * 60 * 1000; // 5 minutes
	const MAX_RELATIVE_DATE = 7 * 24 * 60 * 60 * 1000; // 7 days

	interface MessageBody {
		image?: string;
		video?: string;
		text: string;
		mimeType: string;
	}

	interface MessageEvent {
		event: MatrixEvent;
		date: Date;
		realTime: string;
		body: MessageBody;
	}

	interface MessageEventGroup {
		humanTime: string;
		date: Date;
		events: MessageEvent[];
		sender: string;
		senderAvatar?: string;
		senderName?: string;
		senderColor?: string;
	}

	const timeFormatter = new Intl.DateTimeFormat(undefined, {
		year: undefined,
		month: undefined,
		day: undefined,
		hour: 'numeric',
		minute: 'numeric',
	});
	const dateFormatter = new Intl.DateTimeFormat(undefined, {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});
	const relativeDateFormatter = new Intl.RelativeTimeFormat(undefined, {
		numeric: 'auto',
		style: 'long',
	});

	const formatDate = (date: Date) => {
		if (Date.now() - date.getTime() > MAX_RELATIVE_DATE) {
			return dateFormatter.format(date);
		} else {
			return relativeDateFormatter.format(date.getUTCDate() - new Date().getUTCDate(), 'day');
		}
	};

	let messages: MatrixEvent[] = [];

	$: topic = room.currentState.getStateEvents('m.room.topic', '')?.getContent()?.topic;
	$: isEncrypted = $client.isRoomEncrypted(room.roomId);

	const colorHash = new ColorHash({ saturation: 1.0, lightness: [0.5, 0.7] });

	const optionalMcxToHttp = (url?: string) => {
		if (url) {
			return $client.mxcUrlToHttp(url);
		} else {
			return url;
		}
	};

	// $: messages = messages.sort((a, b) => a.getTs() - b.getTs());
	// $: console.log(messages);

	$: messagesGrouped = messages
		.sort((a, b) => a.getTs() - b.getTs())
		// .filter((event) => event.getType() === EventType.RoomMessage)
		.filter((e) => {
			return e.getType() === EventType.RoomMessage;
		})
		.map((e) => {
			const eventTime = e.getTs();

			// if (e.content.url) {
			// 	console.log(e);
			// }

			return {
				event: e,
				date: new Date(eventTime),
				realTime: timeFormatter.format(eventTime),
				body: {
					// text: e.content['m.new_content']?.formatted_body ?? e.content.formatted_body ?? e.content.body,
					text: e.getContent().body,
					// image: optionalMcxToHttp(e.content.info?.thumbnail_url ?? e.content.url),
					image: optionalMcxToHttp(e.getContent().url),
					// video: optionalMcxToHttp(e.content.url),
					video: optionalMcxToHttp(e.getContent().url),
					// mimeType: e.content.info?.mimetype ?? 'text/plain',
					mimeType: e.getContent().info?.mimetype ?? 'text/plain',
				},
			} as MessageEvent;
		})
		.reduce<MessageEventGroup[]>((acc, val) => {
			const prevSeq = acc[acc.length - 1];
			// if (!prevSeq || prevSeq.sender !== val.event.sender || val.date.getTime() - prevSeq.date.getTime() > MAX_TIMESTAMP_DIFF) {
			if (!prevSeq || prevSeq.sender !== val.event.getSender() || val.date.getTime() - prevSeq.date.getTime() > MAX_TIMESTAMP_DIFF) {
				const time = new RelativeTime();
				// const sender = $client.getUser(val.event.sender);
				const sender = $client.getUser(val.event.getSender());
				// const senderColor = colorHash.hex(val.event.sender);
				const senderColor = colorHash.hex(val.event.getSender());
				acc.push({
					humanTime: time.from(val.date),
					date: val.date,
					events: [val],
					// sender: val.event.sender,
					sender: val.event.getSender(),
					senderAvatar: $client.mxcUrlToHttp(sender?.avatarUrl!, 32, 32, 'scale', false) as string | undefined,
					senderName: sender?.displayName as string | undefined,
					senderColor,
				});
			} else {
				prevSeq.events.push(val);
			}

			return acc;
		}, []);

	// $: console.log(messagesGrouped);

	let reactions: {
		[eventId: string]: {
			[reaction: string]: {
				count: number;
				selfHasReacted: boolean;
			};
		};
	};

	$: {
		const groupedReactions = _.groupBy(
			messages
				.filter((m) => m.getType() === EventType.Reaction)
				// .filter((m) => m.content['m.relates_to'] && m.content['m.relates_to'].rel_type === 'm.annotation')
				.filter((m) => m.getContent()['m.relates_to'] && m.getContent()['m.relates_to']?.rel_type === 'm.annotation')
				.map((m) => {
					// const event = m.content['m.relates_to']?.event_id;
					const event = m.getContent()['m.relates_to']?.event_id;
					// const reaction = m.content['m.relates_to']?.key;
					const reaction = m.getContent()['m.relates_to']?.key;
					const sender = m.getSender();
					return { event, reaction, sender };
				}),
			'event'
		);
		reactions = Object.fromEntries(
			Object.entries(groupedReactions).map(([event, reactions]) => {
				const counts = _.countBy(reactions, 'reaction');
				return [
					event,
					Object.fromEntries(
						Object.entries(counts).map(([reaction, count]) => [
							reaction,
							{
								count,
								selfHasReacted: reactions.some((r) => r.reaction === reaction && r.sender === $client.getUserId()),
							},
						])
					),
				];
			})
		);
	}

	const onMessage = (event: MatrixEvent) => {
		if (event.getRoomId() !== room.roomId) return;

		if (event.getType() === EventType.RoomMessage) {
			if (event.isRelation('m.replace')) {
				const eventId = event.getRelation()!.event_id;
				const index = messages.findIndex((m) => m.getId() === eventId);
				if (index !== -1) {
					messages[index] = event;
				}
			} else {
				// messages.push(event.event as IEventWithRoomId);
				messages.push(event);
			}

			messages = messages;
		} else if (event.getType() === EventType.Reaction) {
			// messages.push(event.event as IEventWithRoomId);
			messages.push(event);
			messages = messages;
		} else {
			if (event.getType().startsWith('m.call')) {
				// Ignore for now
				return;
			}
			console.log('Ignoring event', event.getType(), event);
		}
	};

	let messagesContainer: HTMLElement;

	onMount(() => {
		$client.on('Room.timeline' as any, onMessage);

		console.log('OnRoomMount', room.roomId);

		// $client.roomInitialSync(room.roomId, 50).then((initialSync) => {
		// 	messages = initialSync.messages!.chunk;
		// 	Prism.highlightAll();
		// 	setTimeout(() => {
		// 		if (messagesContainer) {
		// 			messagesContainer.scrollTop = messagesContainer.scrollHeight;
		// 		}
		// 	}, 0);
		// });
	});

	onDestroy(() => {
		$client.off('Room.timeline' as any, onMessage);
		console.log('OnRoomDestroy', room.roomId);
	});

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

	let messageInputActive = true;
</script>

<div class="flex max-w-[calc(100%-16rem)] flex-grow flex-col">
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
		<UserMultiple class="mx-1 h-5 w-5 flex-shrink-0 text-gray-400" />

		<div class="mx-2 flex flex-shrink flex-row items-center overflow-clip rounded bg-slate-900 px-2">
			<input class="min-w-0 bg-slate-900 text-white focus:outline-none" type="text" placeholder="Search" />
			<Search class="h-4 w-4 flex-shrink-0 text-gray-400" />
		</div>

		<MessageQueue class="mx-2 h-5 w-5 flex-shrink-0 text-gray-400" />
		<Help class="mx-2 h-5 w-5 flex-shrink-0 text-gray-400" />
	</div>

	<div class="relative flex max-h-[calc(100%-40px)] max-w-full flex-grow flex-col">
		<div bind:this={messagesContainer} class="flex max-h-full flex-grow flex-col scrollbar-thin scrollbar-thumb-slate-900 scrollbar-thumb-rounded-md" data-infinite-wrapper>
			<InfiniteLoading
				on:infinite={async (event) => {
					try {
						const liveTimeline = room.getLiveTimeline();

						if (!liveTimeline) {
							console.log('No timeline found');
							event.detail.loaded();
							return;
						}

						const isNotDone = await $client.paginateEventTimeline(liveTimeline, { backwards: true, limit: 50 });

						messages = liveTimeline.getEvents().map((event) => event);

						//TODO figure out better scroll behavior

						event.detail.loaded();

						if (!isNotDone) {
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
			{#each messagesGrouped as eventGroup, groupIndex}
				{#if groupIndex === messagesGrouped.length - 1 || eventGroup.date.getDate() != messagesGrouped[groupIndex + 1].date.getDate()}
					<div class="my-2 flex w-full flex-row items-center justify-center px-2 py-1 text-sm font-bold text-gray-400">
						<div class="mx-2 h-px flex-grow bg-gray-600" />
						<p class="w-fit">{formatDate(eventGroup.date)}</p>
						<div class="mx-2 h-px flex-grow bg-gray-600" />
					</div>
				{/if}
				<div class="flex w-full flex-col">
					{#each eventGroup.events as event, i}
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
										<p
											style="color: {eventGroup.senderColor}"
											class="cursor-pointer py-1 font-bold hover:underline"
											on:keypress
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
									<div class="h-full w-full overflow-visible">
										<Media
											class="max-h-96 max-w-md rounded"
											on:vds-fullscreen-change={(e) => console.log('FUllscreen', e)}
											on:vds-fullscreen-error={console.error}
											on:vds-fullscreen-support-change={console.log}
										>
											<MediaSync syncVolume singlePlayback volumeStorageKey="rooms-video-volume">
												<MediaVisibility exitViewport="pause" intersectionThreshold={0.01}>
													<Video
														controls
														poster={event.body.image}
														class="rounded"
														on:fullscreenchange={console.log}
														on:vds-fullscreen-change={console.log}
													>
														<video preload="metadata" src={event.body.video} class="rounded">
															<track kind="captions" />
														</video>
													</Video>
												</MediaVisibility>
											</MediaSync>

											<Poster
												alt="{event.body.text} Preview"
												class="absolute inset-0 media-error:hidden media-started:pointer-events-none media-started:opacity-0"
											/>

											<div
												class="absolute inset-0 flex items-center justify-center rounded bg-black bg-opacity-50 opacity-0 transition-[opacity] duration-300 ease-in media-can-play:opacity-100 media-started:pointer-events-none media-started:opacity-0"
											>
												<PlayButton class="h-12 w-12">
													<PlayFilled class="h-12 w-12" />
												</PlayButton>
											</div>

											<Gesture action="toggle:paused" type="click" class="absolute inset-0" />
										</Media>
									</div>
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

							{#if reactions[event.event.getId()]}
								<!-- This div fills the grid -->
								<div />
								<div class="group">
									{#each Object.entries(reactions[event.event.getId()]) as [emoji, reaction]}
										<div
											class="mr-1 mb-1 inline-flex cursor-pointer select-none flex-row items-center justify-center gap-2 rounded bg-slate-600 px-2 py-[2px] hover:ring-1 hover:ring-blue-400
											{reaction.selfHasReacted ? 'bg-blue-900 ring-1 ring-blue-700' : ''}"
										>
											<p class="text-white">{emoji}</p>
											<p class="text-xs font-bold text-white">{reaction.count}</p>
										</div>
									{/each}

									<FaceAdd class="inline scale-0 cursor-pointer text-slate-400 transition-all duration-200 group-hover:scale-100 hover:text-slate-50" />
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/each}
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
				messageInputActive = false;

				const htmlContent = marked.parseInline(msg.detail.content);
				const html = DomPurify.sanitize(htmlContent);
				$client.sendHtmlMessage(room.roomId, msg.detail.content, html).then((res) => {
					console.log(res);
					messageInputActive = true;
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
			<div id="user-profile-tooltip" use:userProfileContent use:clickOutside={() => (userProfileId = null)}>
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
