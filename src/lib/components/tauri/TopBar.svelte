<script lang="ts">
	import { appWindow } from '@tauri-apps/api/window';
	import Close from 'carbon-icons-svelte/lib/Close.svelte';
	import Copy from 'carbon-icons-svelte/lib/Copy.svelte';
	import Stop from 'carbon-icons-svelte/lib/Stop.svelte';
	import Subtract from 'carbon-icons-svelte/lib/Subtract.svelte';

	let isMaximized = false;

	$: appWindow.isMaximized().then((maximized) => {
		isMaximized = maximized;
	});

	$: appWindow.onResized(() => {
		appWindow.isMaximized().then((maximized) => {
			isMaximized = maximized;
		});
	});
</script>

<div data-tauri-drag-region class="fixed inset-0 bottom-auto z-50 flex h-8 select-none items-center bg-gray-900">
	<h1 class="pl-4 font-plaster text-white" data-tauri-drag-region>Matrix</h1>
	<div class="flex-grow" />
	<button class="flex h-8 w-8 items-center justify-center hover:bg-gray-800" on:click={() => appWindow.minimize()} tabindex="-1">
		<Subtract class="h-6 w-6 cursor-pointer text-white" />
	</button>
	<button class="flex h-8 w-8 items-center justify-center hover:bg-gray-800" on:click={() => appWindow.toggleMaximize()} tabindex="-1">
		{#if isMaximized}
			<Copy class="h-4 w-4 scale-x-[-1] cursor-pointer text-white" />
		{:else}
			<Stop class="h-5 w-5 cursor-pointer text-white" />
		{/if}
	</button>
	<button class="flex h-8 w-8 items-center justify-center hover:bg-red-500" on:click={() => appWindow.close()} tabindex="-1">
		<Close class="h-6 w-6 cursor-pointer text-white" />
	</button>
</div>
