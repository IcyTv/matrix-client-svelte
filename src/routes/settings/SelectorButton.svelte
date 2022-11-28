<script lang="ts">
	import type { SettingsSubPage } from './LeftPane.svelte';

	export let page: SettingsSubPage;
	export let selected: SettingsSubPage;
</script>

<button class="mx-2 w-full rounded px-2 py-1 text-start hover:bg-slate-600" class:selected={selected === page} on:click>
	<slot />
</button>

<style>
	.selected {
		@apply bg-slate-600;
	}
</style>
