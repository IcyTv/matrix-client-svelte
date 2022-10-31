import SHORTCODE_REGEX from 'emojibase-regex/shortcode';
import EMOTICON_REGEX from 'emojibase-regex/emoticon';
import shortcodes from 'emojibase-data/en/shortcodes/emojibase.json';
import emojis from 'emojibase-data/en/compact.json';
import { Node, nodeInputRule } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import Suggestion from '@tiptap/suggestion';
import type { SuggestionOptions } from '@tiptap/suggestion';

export const EmojiExt = Node.create({
	name: 'emoji',
	group: 'inline',
	inline: true,
	selectable: false,
	atom: true,
	inclusive: false,

	addOptions() {
		return {
			suggestion: {
				char: ':',
				pluginKey: new PluginKey('emoji-suggestion'),
				command: ({ editor, range, props }) => {
					// increase range.to by one when the next node is of type "text"
					// and starts with a space character
					const nodeAfter = (editor.view as any).selection.$to.nodeAfter;
					const overrideSpace = nodeAfter?.text?.startsWith(' ');

					if (overrideSpace) {
						range.to += 1;
					}

					editor
						.chain()
						.focus()
						.insertContentAt(range, [
							{
								type: this.name,
								attrs: props,
							},
							{
								type: 'text',
								text: ' ',
							},
						])
						.run();

					window.getSelection()?.collapseToEnd();
				},

				allow: ({ state, range }) => {
					const $from = state.doc.resolve(range.from);
					const type = state.schema.nodes[this.name];
					return !!$from.parent.type.contentMatch.matchType(type);
				},

				render() {
					return {
						// onStart: ({ query }) => {
						// 	searchTerm = query;
						// 	isOpen = true;
						// },
						// onExit: () => {
						// 	isOpen = false;
						// },
						// onUpdate: ({ query }) => {
						// 	searchTerm = query;
						// },
						// onKeyDown: (props) => {
						// 	if (.options.handleKeyDown(props)) return true;
						// 	return false;
						// },
					};
				},
			} as Omit<SuggestionOptions, 'editor'>,
		};
	},

	addAttributes() {
		return {
			emoji: {
				default: null,
				parseHTML: (element) => {
					return {
						name: element.dataset.emojiName,
						char: element.dataset.emojiChar,
					};
				},
				renderHTML: (attributes) => attributes,
			},
		};
	},
	parseHTML() {
		return [{ tag: 'span[data-emoji-name]' }];
	},
	renderHTML({ HTMLAttributes }) {
		if (!HTMLAttributes.emoji || typeof HTMLAttributes.emoji == 'string') {
			// Here we have an invalid emoji, so we should just pass the text through
			return HTMLAttributes['data-emoji-char'];
		}

		//TODO handle invalid shortcodes by ignoring them
		const { char, name } = HTMLAttributes.emoji;

		return [
			'span',
			{
				// contenteditable: "true",
				class: 'emoji-wrapper',
			},
			[
				'span',
				{
					class: 'emoji',
					'data-emoji-name': name,
					'data-emoji-char': char,
					contenteditable: 'false',
				},
				char,
				[
					'div',
					{
						class: 'emoji-tooltip',
						contenteditable: 'false',
					},
					':' + name + ':',
				],
			],
		];
	},
	renderText({ node }) {
		return node.attrs.emoji.char;
	},
	addCommands() {
		return {
			insertEmoji:
				(emoji) =>
				({ tr, dispatch }) => {
					const node = this.type.create({ emoji });

					if (dispatch) {
						tr.replaceRangeWith(tr.selection.from, tr.selection.to, node);
					}

					return true;
				},
		};
	},

	addInputRules() {
		return [
			nodeInputRule({
				find: SHORTCODE_REGEX,
				type: this.type,
				getAttributes: (match) => {
					let shortcode = match[0].slice(1, -1);
					let emojiShortcode = Object.entries(shortcodes).find(([, value]) => {
						if (typeof value == 'string') {
							return value == shortcode;
						} else {
							return value.includes(shortcode);
						}
					});

					let emoji = emojis.find((e) => e.hexcode == emojiShortcode?.[0]);

					if (!emoji) return null;

					return {
						emoji: {
							char: emoji?.unicode,
							name: typeof emojiShortcode?.[1] === 'string' ? emojiShortcode?.[1] : emojiShortcode?.[1][0],
						},
					};
				},
			}),
			//FIXME there currently is no way to cancel invalid input rules... and since we cannot really construct a perfect regex, we have no way to do this...
			// nodeInputRule({
			// 	find: emoticonRegex,
			// 	type: this.type,
			// 	getAttributes: (match) => {
			// 		console.log(match);

			// 		let emoji = emojis.find((e) => e.emoticon == match[0]);
			// 		if (!emoji) return null;

			// 		let emojiShortcode = shortcodes[emoji.hexcode];
			// 		return {
			// 			emoji: {
			// 				char: emoji?.unicode,
			// 				name: typeof emojiShortcode === 'string' ? emojiShortcode : emojiShortcode[0],
			// 			},
			// 		};
			// 	},
			// }),
		];
	},

	addProseMirrorPlugins() {
		return [
			new Plugin({
				key: new PluginKey('hover-emoji'),
				props: {
					handleDOMEvents: {
						mouseover: (view, event) => {
							const { target } = event;
							if (target && (target as HTMLElement).classList.contains('emoji')) {
								let t = target as HTMLElement;
								const bounds = t.getBoundingClientRect();
								const tooltip = t.querySelector('.emoji-tooltip') as HTMLElement;
								tooltip.style.top = `${bounds.top - 5}px`;
								tooltip.style.left = `${bounds.left + bounds.width / 2}px`;
							}
						},
					},
				},
			}),
			Suggestion({
				editor: this.editor,
				...this.options.suggestion,
			}),
		];
	},
});
