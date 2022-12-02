<script lang="ts">
	import type { SettingsSubPage } from './LeftPane.svelte';

	export let page: SettingsSubPage;
	export let selected: SettingsSubPage;
	let clazz = '';
	export { clazz as class };
</script>

<button class="mx-2 flex w-full flex-row items-center rounded px-2 py-1 text-start hover:bg-slate-600 {clazz}" class:selected={selected === page} on:click>
	<slot />
</button>

<style>
	.selected {
		@apply bg-slate-600;
	}
</style>
