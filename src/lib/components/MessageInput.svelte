<script lang="ts">
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';
	import { Editor, Node } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import { AddFilled } from 'carbon-icons-svelte';
	import Placeholder from '@tiptap/extension-placeholder';
	import _ from 'underscore';
	import EmojiList from './EmojiList.svelte';
	import EmojiPickerButton from './EmojiPickerButton.svelte';
	import { EmojiExt } from '$lib/tiptap/emoji';
	import { CustomBold } from '$lib/tiptap/bold';
	import Bold from '@tiptap/extension-bold';

	let element: HTMLDivElement;
	let editor: Editor;

	let emojiList: EmojiList;

	let isOpen = false;
	let searchTerm = '';

	const dispatcher = createEventDispatcher<{
		submit: {
			content: string;
		};
	}>();

	const KeyMapPlugin = Node.create({
		name: 'keymap',
		addKeyboardShortcuts() {
			return {
				Enter: () => {
					console.log('return');
					dispatcher('submit', {
						content: this.editor.getText(),
					});
					this.editor.commands.clearContent();
					return true;
				},
			};
		},
	});

	onMount(() => {
		editor = new Editor({
			element,
			extensions: [
				StarterKit.configure({
					bold: false,
				}),
				KeyMapPlugin,
				EmojiExt.configure({
					suggestion: {
						render() {
							return {
								onStart: ({ query }: any) => {
									searchTerm = query;
									isOpen = true;
								},
								onExit: () => {
									isOpen = false;
								},
								onUpdate: ({ query }: any) => {
									searchTerm = query;
								},
								onKeyDown: (props: any) => {
									if (emojiList.handleKeyDown(props)) return true;
									return false;
								},
							};
						},
					},
				}),

				CustomBold,

				Placeholder.configure({
					placeholder: 'Type something...',
				}),
			],

			onTransaction: () => {
				// Force rerender so editor.isActive works as expected
				editor = editor;
			},
		});
	});

	onDestroy(() => {
		if (editor) {
			editor.destroy();
		}
	});

	export let active = true;

	$: if (editor) {
		editor.setEditable(active);
	}
</script>

<div class="relative m-4 flex flex-row rounded-md bg-slate-600 px-4 py-3">
	<div class="flex items-center justify-center">
		<AddFilled class="mr-2 h-6 w-6 text-slate-400" />
	</div>
	<div
		class="scrollbar-w-1 max-h-48 flex-grow bg-slate-600 leading-8 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-thumb-rounded-md focus:border-none focus:outline-none"
		autocorrect="false"
		bind:this={element}
	/>
	<EmojiList
		bind:this={emojiList}
		on:select={(e) => {
			const { range, emoji } = e.detail;
			editor.commands.deleteRange(range);
			editor.commands.insertEmoji({
				char: emoji.unicode,
				name: emoji.shortcodes[0],
			});
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
			editor.commands.insertEmoji({
				char: emoji.detail.unicode,
				name,
			});
		}}
	/>
</div>

<style>
	:global(.ProseMirror-focused) {
		outline: none;
	}

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

	:global(.ProseMirror) :global(p.is-editor-empty:first-child::before) {
		@apply pointer-events-none float-left h-0 text-slate-400 content-[attr(data-placeholder)];
	}

	:global(.custom-bold) > :global(span) {
		@apply text-slate-400;
	}
</style>
