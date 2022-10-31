<script lang="ts">
	import emojis from 'emojibase-data/en/compact.json';
	import { clickOutside } from 'svelte-use-click-outside';
	import _ from 'underscore';
	import EmojiPicker from './EmojiPicker.svelte';
	const filteredEmojis = emojis.filter((e) => e.group == 0 && e.tags?.includes('face'));
	let currentEmoji = _.sample(filteredEmojis);

	let emojiPickerOpen = false;

	let clazz: string = '';
	export { clazz as class };

	function onHover() {
		currentEmoji = _.sample(filteredEmojis);
	}

	function onClick() {
		emojiPickerOpen = !emojiPickerOpen;
	}

	function onClickOutside() {
		emojiPickerOpen = false;
	}
</script>

<div class="relative {clazz}" use:clickOutside={onClickOutside}>
	<p
		class="ml-4 cursor-pointer select-none text-2xl grayscale transition-all duration-200 ease-bounce hover:scale-125  hover:grayscale-0"
		on:mouseover={onHover}
		on:focus={onHover}
		on:click={onClick}
		on:keydown={onClick}
	>
		{currentEmoji?.unicode}
	</p>

	<EmojiPicker
		class="{emojiPickerOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0'} 
			absolute right-0 top-0 -m-5 origin-bottom-right -translate-y-full transition-all duration-100 ease-in-out"
		on:emoji
	/>
</div>
