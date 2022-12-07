<script lang="ts">
	import Search from 'carbon-icons-svelte/lib/Search.svelte';
	import { createEventDispatcher } from 'svelte';

	import groups from 'emojibase-data/en/messages.json';
	import emojis from 'emojibase-data/en/compact.json';
	import shortcodes from 'emojibase-data/en/shortcodes/emojibase.json';
	import type { CompactEmoji } from 'emojibase';
	import { clickOutside } from 'svelte-use-click-outside';
	import { recentEmojiStore } from '$lib/store';

	const dispatcher = createEventDispatcher();
	let clazz: string = '';
	export { clazz as class };

	let currentHover: {
		char: string;
		shortcode: string;
	} = {
		char: '😀',
		shortcode: 'grinning',
	};

	const onEmojiHover = (emoji: CompactEmoji) => () => {
		let shortcode = shortcodes[emoji.hexcode];
		if (shortcode) {
			if (typeof shortcode !== 'string') {
				shortcode = shortcode[0];
			}
		}
		currentHover = {
			char: emoji.unicode,
			shortcode,
		};
	};

	export let node: HTMLDivElement | null = null;

	$: recentEmojis = $recentEmojiStore.map((recent) => emojis.find((e) => e.unicode === recent[0])).filter((e) => e) as CompactEmoji[];

	const onEmojiClick = (emoji: CompactEmoji) => () => {
		let shortcode = shortcodes[emoji.hexcode];
		if (typeof shortcodes === 'string') {
			shortcode = [shortcodes];
		}

		recentEmojiStore.update((recent) => {
			const index = recent.findIndex((e) => e[0] === emoji.unicode);
			if (index === -1) {
				recent.push([emoji.unicode, 1]);
			} else {
				recent[index][1]++;
			}
			recent = recent.sort((a, b) => b[1] - a[1]);
			// Maximum of 20 recent emojis...
			recent = recent.slice(0, 20);
			return recent;
		});

		dispatcher('emoji', {
			...emoji,
			shortcodes: shortcode,
		});
	};
</script>

<div use:clickOutside={() => dispatcher('click-outside')} bind:this={node} class="flex h-96 w-96 flex-col overflow-clip rounded-lg bg-slate-800 {clazz}">
	<div class="sticky top-0 left-0 right-0 w-full bg-slate-800 p-4 shadow shadow-black">
		<div class="flex w-full items-center overflow-clip rounded bg-slate-900 px-2">
			<input class="flex-grow bg-slate-900 font-sans text-white focus:outline-none" type="text" placeholder=":{currentHover.shortcode}:" />
			<Search class="h-4 w-4 flex-shrink-0 text-gray-400" />
		</div>
	</div>

	<div class="mx-4 mt-5 flex-grow select-none scrollbar-thin scrollbar-track-slate-800 scrollbar-thumb-slate-600 scrollbar-thumb-rounded-lg">
		<div />

		<div class="flex flex-col">
			<h3 class="capitalize">Recent</h3>
			<div class="flex flex-row flex-wrap">
				{#each recentEmojis as emoji}
					<button
						class="group flex h-12 w-12 items-center justify-center rounded hover:bg-slate-500"
						on:click={onEmojiClick(emoji)}
						on:mouseover={onEmojiHover(emoji)}
						on:focus={onEmojiHover(emoji)}
					>
						<p class="text-3xl transition-all duration-150 group-hover:scale-110">{emoji.unicode}</p>
					</button>
				{/each}
			</div>
		</div>

		{#each groups.groups as group}
			<div class="flex flex-col">
				<h3 class="capitalize">{group.message}</h3>
				<div class="flex flex-row flex-wrap">
					{#each emojis.filter((emoji) => emoji.group === group.order) as emoji}
						<button
							class="group flex h-12 w-12 items-center justify-center rounded hover:bg-slate-500"
							on:click={onEmojiClick(emoji)}
							on:mouseover={onEmojiHover(emoji)}
							on:focus={onEmojiHover(emoji)}
						>
							<p class="text-3xl transition-all duration-150 group-hover:scale-110">{emoji.unicode}</p>
						</button>
					{/each}
				</div>
			</div>
		{/each}
	</div>

	<div class="flex items-center gap-4 p-4 shadow-lg shadow-black">
		<span class="text-4xl">{currentHover.char}</span>
		<span class="font-sans">:{currentHover.shortcode}:</span>
	</div>
</div>
