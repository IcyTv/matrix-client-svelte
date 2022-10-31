import { mergeAttributes } from '@tiptap/core';
import { Bold } from '@tiptap/extension-bold';

export const CustomBold = Bold.extend({
	group: 'inline',
	spanning: true,

	parseHTML() {
		console.log('parseHTML');
		return [{ tag: 'strong[custom-bold]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return ['span', { class: 'custom-bold' }, ['span', '**'], ['strong', mergeAttributes(HTMLAttributes, { customBold: true }), 0], ['span', '**']];
	},

	renderText({ node }: any) {
		return `**${node.text}**`;
	},
});
