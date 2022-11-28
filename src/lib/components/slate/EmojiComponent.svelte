<script lang="ts">
	import { Editor, Element as SlateElement } from 'slate';
	import type { Descendant } from 'slate';
	import { getEditorContext } from 'svelte-slate';
	import type { Writable } from 'svelte/store';
	type EmojiElement = {
		type: 'emoji';
		character: string;
		shortcodes: string[];
		children: Descendant[];
	};

	export let element: EmojiElement;
	export let isInline: boolean;
	export let isVoid: boolean;
	export let ref: HTMLElement | undefined = undefined;
	export let dir: string | undefined = undefined;
	export let contenteditable: boolean | undefined = undefined;

	const editorContext = getEditorContext();
	$: editor = $editorContext;
</script>

<span class="emoji-wrapper" data-slate-node="element" data-slate-inline={isInline} data-slate-void={isVoid} {dir} bind:this={ref} {contenteditable}>
	<span class="emoji" contenteditable="false" data-name={element.shortcodes[0]}>{element.character}</span>
	<slot />
</span>

<style>
	.emoji-wrapper {
		user-modify: read-only;
		-moz-user-modify: read-only;
		-webkit-user-modify: read-only;
		@apply pointer-events-none inline-flex h-8 w-6 items-end justify-center;
	}

	.emoji {
		@apply pointer-events-none inline-block w-fit cursor-default select-text overflow-hidden text-2xl;
	}

	:global(span[data-slate-spacer]) {
		@apply absolute h-0 text-transparent outline-none;
	}
</style>
