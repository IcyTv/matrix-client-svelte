import { markInputRule, mergeAttributes, Mark, Node, nodeInputRule, type KeyboardShortcutCommand } from '@tiptap/core';
import { Bold } from '@tiptap/extension-bold';
import { SvelteNodeViewRenderer } from 'svelte-tiptap';
import BoldNodeView from './BoldNodeView.svelte';
import { EditorState, Selection } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';

// const STAR_INPUT_REGEX = /(?:^|\s)\*\*((?:[^*]+))\*\*$/;
const STAR_INPUT_REGEX = /(?:^|\s)(\*\*((?:[^*]+))\*\*)$/;

const arrowHandler = (dir: 'left' | 'right' | 'up' | 'down'): KeyboardShortcutCommand => {
	return ({ editor }): boolean => {
		const { state } = editor;
		const dispatch = editor.view.dispatch;
		if (state.selection.empty) {
			let side = dir == 'left' || dir == 'up' ? -1 : 1;
			let nextPos = Selection.near(state.doc.resolve(state.selection.head + side), side);
			if (nextPos.$head) {
				dispatch(state.tr.setSelection(nextPos).scrollIntoView());
				return true;
			}
		}
		return false;
	};
};

export const CustomBold = Node.create({
	content: 'inline+',
	name: 'bold',
	group: 'inline',
	inline: true,

	addAttributes() {
		return {
			content: {
				default: null,
			},
		};
	},

	parseHTML() {
		console.log('parseHTML');
		return [{ tag: 'svelte-bold-view' }];
	},

	renderHTML({ HTMLAttributes, node }) {
		console.log(HTMLAttributes, node);
		return ['svelte-bold-view', mergeAttributes(HTMLAttributes), 0];
	},

	addKeyboardShortcuts() {
		return {
			ArrowLeft: arrowHandler('left'),
			ArrowRight: arrowHandler('right'),
		};
	},

	addInputRules() {
		return [
			nodeInputRule({
				find: STAR_INPUT_REGEX,
				type: this.type,
				getAttributes: (match) => {
					console.log(match);
					return {
						whole: match[1],
						content: match[2],
					};
				},
			}),
		];
	},

	addNodeView() {
		return SvelteNodeViewRenderer(BoldNodeView);
	},
});
