<svelte:options immutable />

<script lang="ts" context="module">
	export interface IText extends Text {
		bold?: boolean;
		italic?: boolean;
		code?: boolean;
		underline?: boolean;
		strike?: boolean;
		punctuation?: boolean;

		emphasis?: boolean;
		strong?: boolean;
		type: string;
	}
</script>

<script lang="ts">
	import type { Text } from 'slate';

	export let leaf: IText;

	console.log('Leaf', leaf);
</script>

<span
	data-slate-leaf="true"
	class:bold={leaf.bold || leaf.type == 'strong'}
	class:italic={leaf.italic || leaf.emphasis}
	class:code={leaf.code}
	class:underline={leaf.underline}
	class:strike={leaf.strike}
>
	<slot />
</span>

<style>
	.bold {
		@apply font-bold;
	}
	.italic {
		font-style: italic;
	}
	.code {
		font-family: monospace;
		background-color: #eee;
		padding: 3px;
	}
	.underline {
		text-decoration: underline;
	}

	.strike {
		text-decoration: line-through;
	}

	.punctuation {
		@apply text-gray-400;
	}
</style>
