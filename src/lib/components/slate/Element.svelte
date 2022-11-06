<svelte:options immutable />

<script lang="ts" context="module">
	export interface IBaseElement extends ISlateElement {
		type: string;
	}

	export interface IElement extends IBaseElement {
		children: Array<IElement | IText>;
	}
</script>

<script lang="ts">
	import type { Element as ISlateElement } from 'slate';
	import DefaultElement from 'svelte-slate/components/DefaultElement.svelte';

	import EmojiElement from './EmojiComponent.svelte';
	import type { IText } from './Leaf.svelte';

	export let element: IElement;
	export let isInline: boolean;
	export let isVoid: boolean;
	export let contenteditable: boolean;
	export let ref: HTMLElement | undefined = undefined;
	export let dir: 'rtl' | 'ltr' | undefined = undefined;

	$: console.log(element);

	let Element: any = DefaultElement;
	if (element.type === 'emoji') {
		Element = EmojiElement;
	}
</script>

<svelte:component this={Element} bind:ref bind:dir {element} {isInline} {isVoid} {contenteditable}>
	<slot />
</svelte:component>
