import { Node, type Descendant } from 'slate';
import { Text, Transforms, Editor, Range } from 'slate';
import type { BaseSetSelectionOperation } from 'slate';
import EMOJI_REGEX from 'emojibase-regex/shortcode';
import shortcodes from 'emojibase-data/en/shortcodes/emojibase.json';
import emojis from 'emojibase-data/en/compact.json';
import { isBlockActive } from 'svelte-slate/plugins/utils';
import _ from 'underscore';

const stringOrListToList = (stringOrList: string | string[]): string[] => {
	if (typeof stringOrList === 'string') {
		return [stringOrList];
	}
	return stringOrList;
};

type EmojiElement = {
	type: 'emoji';
	character: string;
	shortcodes: string[];
	children: Descendant[];
};

interface EditorWithEmoji extends Editor {
	insertEmoji: (character: string, shortcodes: string[]) => void;
}

export const withEmoji = (editor: Editor) => {
	const { normalizeNode, isInline, isVoid, apply } = editor;

	editor.isInline = (element) => {
		return (element as any).type === 'emoji' || isInline(element);
	};
	editor.isVoid = (element) => {
		return (element as any).type === 'emoji' || isVoid(element);
	};

	editor.normalizeNode = (entry) => {
		const [node, path] = entry;

		if (!Text.isText(node)) {
			return normalizeNode([node, path]);
		}

		const emojiMatch = node.text.match(EMOJI_REGEX);
		if (!emojiMatch) {
			return normalizeNode([node, path]);
		}

		console.log('emojiMatch', emojiMatch);

		let [match] = emojiMatch;
		const { index: startIndex } = emojiMatch;
		const endIndex = startIndex! + match.length;

		console.log('Found emoji', match, startIndex, endIndex);

		const emojiHex = Object.entries(shortcodes).find(([hex, shortcode]) => stringOrListToList(shortcode).includes(match.substring(1, match.length - 1)));
		if (!emojiHex) {
			return normalizeNode([node, path]);
		}

		const emoji = emojis.find((emoji) => emoji.hexcode === emojiHex[0]);
		if (!emoji) {
			return normalizeNode([node, path]);
		}

		const emojiElement: EmojiElement = {
			type: 'emoji',
			character: emoji.unicode,
			shortcodes: stringOrListToList(emojiHex[1]),
			children: [{ text: '' }],
		};

		Editor.withoutNormalizing(editor, () => {
			Transforms.delete(editor, {
				at: {
					path,
					offset: startIndex!,
				},
				distance: match.length,
			});
			Transforms.insertNodes(editor, emojiElement);
		});

		normalizeNode([node, path]);
	};

	editor.apply = (op) => {
		// TODO selection (not cursor movement) is still broken
		// TODO insertion of emoji is broken (probably because of normalization)
		// TODO on copy, we get attach.setAttribute is not a function...
		// TODO: Test if we can break this. It seems to be quite hacky...
		if (op.type !== 'set_selection') {
			return apply(op);
		}
		const selectionOp: BaseSetSelectionOperation = op;
		// if (!selectionOp.newProperties || !selectionOp.properties) {
		// 	return apply(op);
		// }
		const { newProperties, properties } = selectionOp;

		if (!properties) {
			// This should never happen, because emojis have no pointer events and I think the only way to get here
			// is with a click on a blurred editor
			return apply(op);
		}

		const enteredNode =
			newProperties?.anchor?.path &&
			Editor.node(editor, newProperties.anchor.path, {
				depth: 2,
			});

		if (!enteredNode) {
			return apply(op);
		}

		const [node, path] = enteredNode as [EmojiElement, number[]];

		if (node.type !== 'emoji') {
			return apply(op);
		}

		const prev = Editor.previous(editor, {
			at: path,
		});
		const next = Editor.next(editor, {
			at: path,
		});

		if (!prev || !next) {
			console.log('Emoji node has no previous or next node', op, node, path);
			return apply(op);
		}

		// Did qwerty enter the emoji node from the left?
		const enteredFromLeft = prev && _.isEqual(prev[1], properties.anchor?.path);

		if (enteredFromLeft) {
			Transforms.select(editor, {
				anchor: {
					path: next[1],
					offset: 0,
				},
				focus: {
					path: next[1],
					offset: 0,
				},
			});
			return;
		}

		const enteredFromRight = next && _.isEqual(next[1], properties.anchor?.path);
		if (enteredFromRight) {
			Transforms.select(editor, {
				anchor: {
					path: prev[1],
					offset: Node.string(prev[0]).length,
				},
				focus: {
					path: prev[1],
					offset: Node.string(prev[0]).length,
				},
			});
			return;
		}

		console.warn("No idea where we're coming from", prev, next, properties.anchor?.path);

		return apply(op);
	};

	return editor;

	// return {
	// 	...editor,
	// insertEmoji: (character, shortcodes) => {
	// 	const emojiElement: EmojiElement = {
	// 		type: 'emoji',
	// 		character,
	// 		shortcodes,
	// 		children: [{ text: '' }],
	// 	};
	// 	Transforms.insertNodes(editor, emojiElement);
	// },
	// };
};

export const EmojiEditor = {
	...Editor,
	insertEmoji: (editor: Editor, character: string, shortcodes: string[]) => {
		const emojiElement: EmojiElement = {
			type: 'emoji',
			character,
			shortcodes,
			children: [{ text: character }],
		};
		Transforms.insertNodes(editor, emojiElement, {
			voids: true,
			hanging: true,
			select: true,
		});
	},
};
