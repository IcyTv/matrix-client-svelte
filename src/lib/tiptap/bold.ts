import { markInputRule, mergeAttributes, Mark } from '@tiptap/core';
import { Bold } from '@tiptap/extension-bold';

const STAR_INPUT_REGEX = /(?:^|\s)\*\*((?:[^*]+))\*\*$/;

export const CustomBold = Mark.create({
	content: 'inline*',
	exitable: true,
	atom: false,
	defining: true,

	parseHTML() {
		console.log('parseHTML');
		return [{ tag: 'strong[custom-bold]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'span',
			mergeAttributes(HTMLAttributes, {
				class: 'custom-bold',
			}),
			['span', '**'],
			['strong', {}, 0],
			['span', '**'],
		];
	},

	onTransaction: ({ transaction }) => {
		console.log('onTransaction', transaction);
	},
	addInputRules() {
		return [
			markInputRule({
				find: STAR_INPUT_REGEX,
				type: this.type,
			}),
		];
	},
});
