<script lang="ts">
	import { FaceAdd, OverflowMenuHorizontal, Reply, UserAvatar } from 'carbon-icons-svelte';
	import type { EventTimelineSet, MatrixEvent } from 'matrix-js-sdk';
	import { createEventDispatcher } from 'svelte';
	import { fullTimeFormatter, relativeTime, timeFormatter } from './timeFormatters';
	import VideoMessage from './VideoMessage.svelte';
	import ThreadIcon from '$lib/components/icons/ThreadIcon.svelte';
	import { client } from '$lib/store';
	import type { Writable } from 'svelte/store';
	import { bind } from 'svelte-simple-modal';
	import ImagePopup from '$lib/components/ImagePopup.svelte';
	import { ONLY_EMOJI_REGEX } from './utils';
	import DOMPurify from 'dompurify';

	export let event: MatrixEvent;
	export let isFirst = false;
	export let modalStore: Writable<any> | undefined = undefined;
	export let timelineSet: EventTimelineSet;

	interface Events {
		senderClick: {
			originalEvent: MouseEvent;
			senderId: string;
		};
		emojiClick: MouseEvent;
		reply: {};
		redactReaction: {
			reactionEvent?: MatrixEvent;
		};
	}

	const colorHash = (num: number, max = 100) => {
		const n = (num * 240) / max;
		return `hsl(${n}, 100%, 50%)`;
	};

	const dispatch = createEventDispatcher<Events>();

	$: eventDate = event.getDate();
	$: realTime = eventDate && timeFormatter.format(eventDate);
	$: humanTime = eventDate && relativeTime.from(eventDate);
	$: fullTime = eventDate && fullTimeFormatter.format(eventDate);

	$: senderAvatarUrl = event.sender?.getAvatarUrl($client.baseUrl, 32, 32, 'scale', true, true);

	$: content = event.getContent();
	$: mimeType = content?.info?.mimetype ?? 'text/plain';

	$: url = content?.url;
	$: realUrl = url && $client.mxcUrlToHttp(url);
	$: plainText = content?.body;
	$: htmlText = content?.formatted_body;

	DOMPurify.addHook('afterSanitizeAttributes', (node) => {
		if (node.tagName === 'A') {
			node.setAttribute('target', '_blank');
			node.setAttribute('rel', 'noopener noreferrer');
		}
	});

	$: pureHTMLText =
		htmlText &&
		DOMPurify.sanitize(htmlText, {
			FORBID_TAGS: ['mx-reply'],
			KEEP_CONTENT: false,
		});
	// $: pureHTMLText = htmlText;

	$: reactions = timelineSet.relations.getChildEventsForEvent(event.getId(), 'm.annotation', 'm.reaction');
	$: transformedReactions = reactions
		?.getSortedAnnotationsByKey()
		.map(([emoji, set]) => {
			const count = set.size;
			if (count === 0) return undefined;
			const reactedEvent = Array.from(set).find((e) => e.sender?.userId === $client.getUserId());
			return { emoji, count, reactedEvent };
		})
		.filter(Boolean) as { emoji: string; count: number; reactedEvent?: MatrixEvent }[] | undefined;

	$: isReply = event.replyEventId;
	$: replyEvent =
		(event.replyEventId &&
			timelineSet
				.getTimelineForEvent(event.getId())
				?.getEvents()
				.find((e) => e.getId() === event.replyEventId)) ||
		undefined;

	$: replySenderAvatar = replyEvent?.sender?.getAvatarUrl($client.baseUrl, 32, 32, 'scale', true, true);
	$: replySenderName = replyEvent?.sender?.name;
	$: replySenderColor = (replyEvent?.sender?.powerLevel && colorHash(replyEvent.sender.powerLevel)) || 'inherit';
</script>

<div class="message group relative grid max-w-full pr-8 hover:bg-slate-800" data-scroll-tokens={event.getId()}>
	{#if isFirst}
		<button
			class="inline-flex h-fit cursor-pointer select-none items-center justify-center active:scale-95"
			class:mt-6={isReply}
			on:click={(e) => {
				dispatch('senderClick', {
					originalEvent: e,
					senderId: event.sender?.userId ?? '',
				});
			}}
		>
			{#if senderAvatarUrl}
				<img class="mx-4 mt-2 h-10 w-10 rounded-full" src={senderAvatarUrl} alt="Profile" />
			{:else}
				<UserAvatar class="mx-4 mt-2 h-10 w-10 rounded-full" />
			{/if}
		</button>
	{:else}
		<div class="invisible flex items-center justify-center group-hover:visible">
			<p class="text-xs text-slate-400">{realTime}</p>
		</div>
	{/if}

	<div>
		{#if isReply}
			<div class="reply">
				<img class="h-4 w-4 flex-shrink-0 rounded-full" src={replySenderAvatar} alt="Reply Profile" />
				<p class="flex-shrink-0 font-bold" style="color {replySenderColor};">{replySenderName}</p>
				<!--TODO adjust max-width...-->
				<p class="block max-h-4 max-w-xs flex-shrink overflow-hidden overflow-ellipsis whitespace-nowrap text-sm font-light text-slate-500 sm:max-w-md">
					{replyEvent?.getContent().body}
				</p>
			</div>
		{/if}

		{#if isFirst}
			<div class="flex flex-row items-center gap-4">
				<button
					style={`color: ${colorHash(event.sender?.powerLevel ?? 0)};`}
					class="cursor-pointer py-1 font-bold hover:underline"
					on:click={(e) => {
						dispatch('senderClick', {
							originalEvent: e,
							senderId: event.sender?.userId ?? '',
						});
					}}
				>
					{event.sender?.name ?? '<Unknown>'}
				</button>
				<p class="text-sm font-light text-slate-500 group-hover:hidden">{humanTime}</p>
				<p class="hidden text-sm font-light text-slate-500 group-hover:block">{fullTime}</p>
			</div>
		{/if}

		{#if mimeType.startsWith('image/')}
			<img
				class="max-h-96 max-w-full cursor-pointer rounded"
				src={realUrl}
				alt={plainText ?? 'Image'}
				on:click={() => modalStore?.set(bind(ImagePopup, { src: realUrl, text: plainText ?? 'Image' }))}
				on:keydown={() => console.error('TODO')}
				role="button"
				tabindex="0"
			/>
			<!-- TODO modal -->
		{:else if mimeType.startsWith('video/')}
			<VideoMessage {event} />
		{:else if ONLY_EMOJI_REGEX.test(plainText)}
			<p class="message-content text-4xl">{plainText}</p>
		{:else if htmlText}
			<div>
				{@html pureHTMLText}
			</div>
		{:else}
			<p class="message-content">{plainText}</p>
		{/if}
	</div>

	<div class="absolute right-2 top-0 mx-2 hidden -translate-y-1/2 flex-row items-center justify-center overflow-clip rounded bg-slate-800 shadow shadow-black group-hover:flex">
		<button class="mab" on:click={(e) => dispatch('emojiClick', e)}><FaceAdd class="h-8 w-8 p-2" /></button>
		<button class="mab" on:click={() => dispatch('reply', {})}><Reply class="h-8 w-8 p-2" /></button>
		<button class="mab"><ThreadIcon class="h-8 w-8 p-2" /></button>
		<button class="mab"><OverflowMenuHorizontal class="h-8 w-8 p-2" /></button>
	</div>

	{#if reactions && transformedReactions && transformedReactions.length > 0}
		<div />
		<div class="group mb-1 flex items-center gap-1">
			{#each transformedReactions as reaction}
				{#if reaction.count > 0}
					<button
						class="inline-flex cursor-pointer select-none flex-row items-center justify-center gap-2 rounded bg-slate-600 px-2 py-[2px] hover:ring-1 hover:ring-blue-400"
						class:bg-indigo-900={!!reaction.reactedEvent}
						class:ring-1={!!reaction.reactedEvent}
						class:ring-indigo-700={!!reaction.reactedEvent}
						on:click={() => dispatch('redactReaction', { reactionEvent: reaction.reactedEvent })}
					>
						<p class="text-white">{reaction.emoji}</p>
						<p class="text-sm">{reaction.count}</p>
					</button>
				{/if}
			{/each}

			<button
				class="inline-flex h-full scale-0 items-center p-1 text-slate-400 transition-all duration-200 group-hover:scale-100 hover:text-slate-50"
				on:click={(e) => dispatch('emojiClick', e)}
			>
				<FaceAdd class="block h-full w-full" />
			</button>
		</div>
	{/if}
</div>

<style>
	.message {
		grid-template-columns: theme(spacing.20) 1fr;
	}

	.message-content :global(pre) {
		@apply rounded;
	}

	.mab {
		@apply text-gray-400 hover:bg-slate-700;
	}

	.message :global(a) {
		@apply text-blue-400 hover:underline;
	}

	.reply {
		@apply relative mt-2 flex cursor-pointer gap-2 text-left align-baseline text-sm leading-[1.125rem];

		--avatar-size: 40px;
		--gutter: 16px;
		--spine-width: 2px;
	}

	.reply::before {
		content: '';
		@apply absolute top-1/2 right-full bottom-0 mr-1 block;
		left: calc(var(--avatar-size) / 2 * -1 + var(--gutter) * -1);
		border-left: var(--spine-width) solid theme('colors.slate.600');
		border-bottom: 0 solid transparent;
		border-right: 0 solid transparent;
		border-top: var(--spine-width) solid theme('colors.slate.600');
		border-top-left-radius: 6px;
	}
</style>
