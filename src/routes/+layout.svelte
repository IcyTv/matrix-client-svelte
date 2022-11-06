<script lang="ts">
	import '@fontsource/poppins';
	import '@fontsource/roboto-mono';
	import '@fontsource/plaster/400.css';

	import { client } from '$lib/store';
	import '../app.css';
	import Spinner from '$lib/components/Spinner.svelte';
	import { goto } from '$app/navigation';
	import { navigating } from '$app/stores';
	import { appWindow } from '@tauri-apps/api/window';

	import { logger } from 'matrix-js-sdk/lib/logger';
	import { Close, CollapseAll, Copy, ExpandAll, Scale, SquareFill, Stop, Subtract } from 'carbon-icons-svelte';

	logger.setLevel('WARN');

	client.fetch().catch(console.error);

	let isMaximized = false;

	$: appWindow.isMaximized().then((maximized) => {
		isMaximized = maximized;
	});

	$: appWindow.onResized(() => {
		appWindow.isMaximized().then((maximized) => {
			isMaximized = maximized;
		});
	});

	let isLoggedIn = $client?.isLoggedIn();
	if (isLoggedIn == false && !location.pathname.startsWith('/login')) {
		goto('/login');
	}
</script>

<main class="h-screen w-screen bg-gray-900">
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

	{#if $navigating}
		<div class="flex h-full items-center justify-center bg-slate-700">
			<Spinner />
			<div class="ml-4 text-slate-400">Loading...</div>
		</div>
	{:else}
		<div class="h-full w-full pt-8">
			<slot />
		</div>
	{/if}
</main>
