<script lang="ts">
	import type { NodeViewProps } from '@tiptap/core';
	import { NodeViewWrapper, editable } from 'svelte-tiptap';

	export let node: NodeViewProps['node'];
</script>

<NodeViewWrapper class="whitespace-nowrap">
	<span class="p-0 text-gray-400" contenteditable="true" on:input={console.log}>**</span>
	<span class="inline p-0 font-bold" use:editable>{node.attrs.content}</span>
	<span class="p-0 text-gray-400" contenteditable="true">**</span>
</NodeViewWrapper>
