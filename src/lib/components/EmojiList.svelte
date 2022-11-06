<script lang="ts">
	import Fuse from 'fuse.js';
	import emojiData from 'emojibase-data/en/compact.json';
	import shortcodes from 'emojibase-data/en/shortcodes/emojibase.json';
	import { createEventDispatcher } from 'svelte';
	import type { CompactEmoji } from 'emojibase';

	let clazz: string = '';
	export { clazz as class };
	export let searchTerm: string;
	export let open: boolean;

	const emojis = emojiData.map((emoji) => {
		const shortcode = shortcodes[emoji.hexcode];
		return {
			...emoji,
			shortcodes: typeof shortcode === 'string' ? [shortcode] : shortcode,
		};
	});

	const fuse = new Fuse(emojis, {
		keys: [
			{
				name: 'shortcodes',
				weight: 0.7,
			},
			{
				name: 'tag',
				weight: 0.3,
			},
		],
		isCaseSensitive: false,
		shouldSort: true,
		useExtendedSearch: false,
		threshold: 0.3,
	});

	let selected = -1;

	$: openClasses = open ? 'opacity-100 scale-100' : 'opacity-0 scale-0';

	$: result = fuse.search(searchTerm, { limit: 10 });

	const dispatch = createEventDispatcher<{
		select: {
			emoji: {
				shortcodes: string[];
				skins?: CompactEmoji[] | undefined;
				unicode: string;
				emoticon?: string | string[] | undefined;
				group?: number | undefined;
				hexcode: string;
				label: string;
				order?: number | undefined;
				tags?: string[] | undefined;
			};
		};
	}>();

	export const handleKeyDown = (event: KeyboardEvent) => {
		if (open) {
			if (event.key == 'ArrowDown') {
				selected += 1;
				selected %= result.length;
				return true;
			} else if (event.key == 'ArrowUp') {
				selected -= 1;
				if (selected < 0) selected = result.length - 1;
				selected %= result.length;
				return true;
			} else if (event.key == 'Enter') {
				dispatch('select', {
					emoji: result[selected].item,
				});
				selected = -1;
				return true;
			}
		}

		return false;
	};
</script>

<div class="flex flex-col bg-slate-800 p-2 transition-all duration-150 {openClasses} {clazz}">
	<div class="text-xs uppercase text-gray-500">
		EMOJI MATCHING&nbsp;
		<span class="font-bold">{searchTerm}</span>
	</div>
	<div class="flex flex-col p-1">
		<div />
		{#each result as emoji, i}
			<div class="{selected == i ? 'bg-slate-600' : ''} flex cursor-pointer items-center gap-4 rounded px-2 py-1 hover:bg-slate-600">
				<span>{emoji.item.unicode}</span>
				<span class="font-sans">
					{Array.from(emoji.item.shortcodes || [])
						.map((shortcode) => `:${shortcode}:`)
						.join(' ')}
				</span>
			</div>
		{/each}
	</div>
</div>
