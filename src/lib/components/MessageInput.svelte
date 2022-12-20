<script lang="ts">
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';
	import AddFilled from 'carbon-icons-svelte/lib/AddFilled.svelte';
	import _ from 'underscore';
	import EmojiList from './EmojiList.svelte';
	import EmojiPickerButton from './EmojiPickerButton.svelte';
	import { Slate, withSvelte, Editable, focus, type ISvelteEditor } from 'svelte-slate';
	// import Slate from 'svelte-slate/components/Slate.svelte';
	import { createEditor, Node as SlateNode, Text, Range, Transforms, Editor, Node, type BaseRange, type BaseEditor, Path } from 'slate';
	import Leaf from './slate/Leaf.svelte';
	import Element from './slate/Element.svelte';

	import { marked } from 'marked';
	import { EmojiEditor, withEmoji } from './slate/withEmoji';
	import SendButton from './SendButton.svelte';
	import { withCode } from 'svelte-slate/plugins/CodeElement.svelte';
	import type { MatrixEvent } from 'matrix-js-sdk';
	import { CloseFilled } from 'carbon-icons-svelte';

	export let replyingTo: MatrixEvent | undefined = undefined;

	let emojiList: EmojiList;

	let isOpen = false;
	let searchTerm = '';

	const dispatcher = createEventDispatcher<{
		submit: {
			content: string;
		};
	}>();

	const editor = withEmoji(withCode(withSvelte(createEditor()))) as ISvelteEditor & typeof EmojiEditor & BaseEditor;
	let value: any[] = [
		{
			type: 'paragraph',
			children: [{ text: '' }],
		},
	];

	interface Range {
		anchor: { path: number[]; offset: number };
		focus: { path: number[]; offset: number };
		lang?: string;
		[key: string]: boolean | string | { path: number[]; offset: number } | undefined;
	}

	const pushWithPunctuation = (ranges: Range[], defaultRange: Range, punctuationWidth: number) => {
		ranges.push({
			punctuation: true,
			anchor: {
				path: defaultRange.anchor.path,
				offset: defaultRange.anchor.offset,
			},
			focus: {
				path: defaultRange.anchor.path,
				offset: defaultRange.anchor.offset + punctuationWidth,
			},
		});
		ranges.push({
			...defaultRange,
			anchor: {
				path: defaultRange.anchor.path,
				offset: defaultRange.anchor.offset + punctuationWidth,
			},
			focus: {
				path: defaultRange.focus.path,
				offset: defaultRange.focus.offset - punctuationWidth,
			},
		});
		ranges.push({
			punctuation: true,
			anchor: {
				path: defaultRange.focus.path,
				offset: defaultRange.focus.offset - punctuationWidth,
			},
			focus: {
				path: defaultRange.focus.path,
				offset: defaultRange.focus.offset,
			},
		});
	};

	type TextToken = Extract<marked.Token, { text: string }>;

	type TokenWithChildren = Extract<marked.Token, { tokens: marked.Token[] }>;

	const CODE_GENERATION_RE = /```([a-zA-Z]*)/g;

	const decorate = (el: any): never[] => {
		const [node, path] = el;

		const ranges: Range[] = [];

		if (!Text.isText(node)) {
			return ranges as never[];
		}

		const tokenizer: Partial<marked.Tokenizer<never>> = {
			...marked.defaults.tokenizer,
			heading: (() => undefined) as any,
			list: (() => undefined) as any,
			table: (() => undefined) as any,
		};

		marked.use({ tokenizer });
		const tokens = marked.lexer(node.text, {
			gfm: true,
			sanitize: true,
			smartypants: true,
			highlight: (code, lang, cb) => {
				return code;
			},
		});

		let offset = 0;

		const addRange = (token: marked.Token, end: number) => {
			if (token.type != 'text') {
				if ((token as TextToken).text) {
					//TODO do we have uneven punctuation? If so, we need to change this
					const punctuationOffset = (token.raw.length - (token as TextToken).text.length) / 2;
					pushWithPunctuation(
						ranges,
						{
							[token.type]: true,
							anchor: { path, offset: offset },
							focus: { path, offset: end },
						},
						punctuationOffset
					);
				} else {
					ranges.push({
						[token.type]: true,
						anchor: { path, offset },
						focus: { path, offset: end },
					});
				}

				if ((token as TokenWithChildren).tokens) {
					(token as TokenWithChildren).tokens.forEach((childToken) => {
						addRange(childToken, end);
					});
				}
			}
		};

		if ((tokens[0] as marked.Tokens.Paragraph | undefined)?.tokens) {
			for (const token of (tokens[0] as marked.Tokens.Paragraph).tokens) {
				const length = token.raw.length;
				const end = offset + length;

				addRange(token, end);

				offset = end;
			}
		}

		const codeMatches = node.text.matchAll(CODE_GENERATION_RE);

		for (const match of codeMatches) {
			const start = match.index;
			const end = start! + match[0].length;

			ranges.push({
				codeAnnotation: true,
				anchor: { path, offset: start! },
				focus: { path, offset: start! + 3 },
			});

			ranges.push({
				codeAnnotation: true,
				lang: match[1],
				anchor: { path, offset: start! + 3 },
				focus: { path, offset: end },
			});
		}

		return ranges as never[];
	};

	let selection: Range | null = null;
	let emojiShortcodeSearchRange: BaseRange | null = null;

	$: {
		if (selection && Range.isCollapsed(selection)) {
			const [start] = Range.edges(selection);

			const wordBefore = Editor.before(editor, start, { unit: 'word' });
			const before = wordBefore && Editor.before(editor, wordBefore);
			const beforeRange = before && Editor.range(editor, before, start);
			const beforeText = beforeRange && Editor.string(editor, beforeRange);
			const beforeMatch = beforeText && beforeText.match(/^:(\w+)$/);
			const after = Editor.after(editor, start);
			const afterRange = Editor.range(editor, start, after);
			const afterText = Editor.string(editor, afterRange);
			const afterMatch = afterText.match(/^(\s|$)/);

			if (beforeMatch && afterMatch) {
				searchTerm = beforeMatch[1];
				emojiShortcodeSearchRange = beforeRange;
				if (searchTerm.length >= 2) {
					isOpen = true;
				}
			}
		}
	}

	const onKeyDown = (ev: KeyboardEvent) => {
		if (isOpen && ev.key == ' ') {
			isOpen = false;
		}

		if (isOpen) {
			if (emojiList.handleKeyDown?.(ev)) {
				ev.preventDefault();
				ev.stopImmediatePropagation();
				return false;
			}
		}

		if (ev.key === 'Enter' && !ev.shiftKey) {
			ev.preventDefault();
			const text = value.map((n) => Node.string(n)).join('\n');

			if (text.length > 0) {
				value = [{ type: 'paragraph', children: [{ text: '' }] }];
				// selection = {
				// 	anchor: { path: [0, 0], offset: 0 },
				// 	focus: { path: [0, 0], offset: 0 },
				// };

				dispatcher('submit', {
					content: text,
				});
			}

			return false;
		}
	};

	const onEmoji = (emoji: CustomEvent<any>) => {
		let name;
		if (typeof emoji.detail.shortcodes === 'string') {
			name = [emoji.detail.shortcodes];
		} else {
			name = emoji.detail.shortcodes;
		}
		if (!selection) {
			/// Set selection to the end of the document
			Transforms.select(editor, Editor.end(editor, []));
			selection = editor.selection as Range;
		}

		const nextPath = Path.next(Path.next(selection.anchor.path));

		EmojiEditor.insertEmoji(editor, emoji.detail.unicode, name);
		Editor.normalize(editor);

		Transforms.select(editor, { path: nextPath, offset: 0 });
		focus(editor);
	};
</script>

<div class="relative m-4 flex flex-row rounded-md bg-slate-600 px-4 py-3">
	{#if replyingTo}
		<div class="absolute left-0 right-0 top-0 flex -translate-y-full flex-row items-center justify-between rounded bg-slate-800 px-2 text-sm">
			<p>Replying to <span class="font-bold">{replyingTo.sender?.name}</span></p>
			<button class="p-2" on:click={() => (replyingTo = undefined)}>
				<CloseFilled class="h-4 w-4 text-slate-400" />
			</button>
		</div>
	{/if}
	<div class="flex items-center justify-center">
		<AddFilled class="mr-2 h-6 w-6 text-slate-400" />
	</div>

	<Slate {editor} bind:value bind:selection>
		<Editable
			class="flex-grow bg-slate-600 text-[16px] leading-8 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-thumb-rounded-md focus:border-none focus:outline-none"
			placeholder="Type a message..."
			{Leaf}
			{Element}
			{decorate}
			spellcheck={false}
			{onKeyDown}
		/>
	</Slate>

	<EmojiList
		bind:this={emojiList}
		on:select={(e) => {
			const { emoji } = e.detail;
			if (emojiShortcodeSearchRange && selection) {
				const nextPath = Path.next(Path.next(emojiShortcodeSearchRange.anchor.path));
				const nextPoint = { path: nextPath, offset: 0 };
				Transforms.delete(editor, { at: emojiShortcodeSearchRange });
				EmojiEditor.insertEmoji(editor, emoji.unicode, emoji.shortcodes);
				Editor.normalize(editor);

				Transforms.select(editor, nextPoint);
			}
			isOpen = false;
		}}
		open={isOpen}
		class="absolute top-0 left-0 right-0 -translate-y-[calc(100%+1rem)] rounded shadow-lg shadow-slate-800"
		{searchTerm}
	/>
	<EmojiPickerButton on:emoji={onEmoji} />

	<SendButton />
</div>

<style>
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
