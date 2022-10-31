<script lang="ts">
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';
	import AddFilled from 'carbon-icons-svelte/lib/AddFilled.svelte';
	import _ from 'underscore';
	import EmojiList from './EmojiList.svelte';
	import EmojiPickerButton from './EmojiPickerButton.svelte';
	import { Slate, Editable, withSvelte } from 'svelte-slate';
	import { createEditor, Node as SlateNode } from 'slate';
	import Leaf from './slate/Leaf.svelte';
	import { unified } from 'unified';
	import remarkParse from 'remark-parse';
	import { remarkToSlate, slateToRemark } from 'remark-slate-transformer';
	import stringify from 'remark-stringify';
	import { marked } from 'marked';
	import { jsx } from 'slate-hyperscript';

	const deserialize = (el: Node, markAttributes: any = {}) => {
		console.log(el);
		if (el.nodeType === Node.TEXT_NODE) {
			return jsx('text', markAttributes, el.textContent);
		} else if (el.nodeType !== Node.ELEMENT_NODE) {
			return null;
		}

		const nodeAttributes = { ...markAttributes };

		// define attributes for text nodes
		switch (el.nodeName) {
			case 'strong':
				nodeAttributes.bold = true;
				break;
			case 'em':
				nodeAttributes.italic = true;
				break;
		}

		const children: any = Array.from(el.childNodes)
			.map((node) => deserialize(node as any, nodeAttributes))
			.flat();

		if (children.length === 0) {
			children.push(jsx('text', nodeAttributes, ''));
		}

		switch (el.nodeName) {
			case 'BODY':
				return jsx('fragment', {}, children);
			case 'BR':
				return '\n';
			case 'BLOCKQUOTE':
				return jsx('element', { type: 'quote' }, children);
			case 'P':
				return jsx('element', { type: 'paragraph' }, children);
			default:
				return children;
		}
	};

	let element: HTMLDivElement;

	let emojiList: EmojiList;

	let isOpen = false;
	let searchTerm = '';

	const dispatcher = createEventDispatcher<{
		submit: {
			content: string;
		};
	}>();

	const editor = withSvelte(createEditor());
	let value: any[] = [
		{
			type: 'paragraph',
			children: [{ text: 'Test' }],
		},
	];

	const serialize = (nodes: any) => {
		return nodes.map((n: any) => SlateNode.string(n)).join('\n');
	};

	$: {
		const text = serialize(value);
		const out = marked.parseInline(text);
		const tmp = new DOMParser().parseFromString(out, 'text/html').body;
		console.log(tmp);
		console.log(deserialize(tmp));
	}
</script>

<div class="relative m-4 flex flex-row rounded-md bg-slate-600 px-4 py-3">
	<div class="flex items-center justify-center">
		<AddFilled class="mr-2 h-6 w-6 text-slate-400" />
	</div>
	<!-- <div
		class="scrollbar-w-1 max-h-48 flex-grow bg-slate-600 leading-8 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-thumb-rounded-md focus:border-none focus:outline-none"
		autocorrect="false"
	/> -->

	<Slate {editor} bind:value>
		<!-- {decorate} -->
		<Editable
			class="flex-grow bg-slate-600 leading-8 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-thumb-rounded-md focus:border-none focus:outline-none"
			placeholder="Type a message..."
			{Leaf}
			spellcheck={false}
		/>
	</Slate>

	<EmojiList
		bind:this={emojiList}
		on:select={(e) => {
			const { range, emoji } = e.detail;
			isOpen = false;
		}}
		open={isOpen && searchTerm.length >= 2}
		{searchTerm}
		class="absolute top-0 left-0 right-0 -translate-y-[calc(100%+1rem)] rounded shadow-lg shadow-slate-800"
	/>
	<EmojiPickerButton
		on:emoji={(emoji) => {
			let name;
			if (typeof emoji.detail.shortcodes === 'string') {
				name = emoji.detail.shortcodes;
			} else {
				name = emoji.detail.shortcodes[0];
			}
		}}
	/>
</div>

<style>
	:global(.emoji) {
		@apply inline-block h-8 cursor-default select-text align-bottom text-2xl leading-8;
	}

	:global(.emoji-tooltip) {
		@apply pointer-events-none fixed -top-2 left-1/2 z-30 w-auto origin-bottom -translate-y-full -translate-x-1/2 scale-0 select-none rounded bg-slate-900 p-2
			text-xs opacity-0 transition-[transform,opacity] duration-300 ease-in-out
			before:absolute before:top-full before:left-1/2 before:h-0 before:w-0 before:-translate-x-1/2 before:border-4
			before:border-x-transparent before:border-b-transparent before:border-t-slate-900 before:content-[''];
	}

	:global(.emoji):hover > :global(.emoji-tooltip) {
		@apply scale-100 opacity-100;
	}
</style>
