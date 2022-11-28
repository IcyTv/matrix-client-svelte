<script lang="ts" context="module">
	export type CodeBlockElement = {
		type: 'codeblock';
		language: string;
		children: Descendant[];
	};
</script>

<script lang="ts">
	import type { Descendant } from 'slate';
	import Prism from 'prismjs';

	export let element: CodeBlockElement;
	export let isInline: boolean;
	export let isVoid: boolean;
	export let ref: HTMLElement | undefined = undefined;
	export let dir: string | undefined = undefined;
	export let contenteditable: boolean | undefined = undefined;

	$: {
		if (ref) {
			Prism.highlightElement(ref, true);
		}
	}
</script>

<pre class="code-block language-{element.language}" data-slate-node="element" data-slate-inline={isInline} data-slate-void={isVoid} {dir} bind:this={ref} {contenteditable}>
	<code>
		<slot />
	</code>
</pre>

<style>
	.code-block {
		@apply relative inline-block rounded-md bg-gray-100 p-2;
	}

	:global(span[data-slate-spacer]) {
		@apply absolute h-0 text-transparent outline-none;
	}
</style>
