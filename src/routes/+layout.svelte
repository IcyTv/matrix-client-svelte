<script lang="ts">
	import '@fontsource/poppins';
	import '@fontsource/roboto-mono';
	import '@fontsource/plaster/400.css';

	import { client, isLoggedIn } from '$lib/store';
	import '../app.css';
	import { goto } from '$app/navigation';

	import { logger } from 'matrix-js-sdk/lib/logger';

	import Notifications from 'svelte-notifications';
	import VerificationModal from '$lib/verification/VerificationModal.svelte';
	import { page } from '$app/stores';
	import TopBar from '$lib/components/tauri/TopBar.svelte';

	logger.setLevel('WARN');

	$: console.log('Is logged in?', $isLoggedIn);

	$: if ($isLoggedIn === false && !$page.url.pathname.startsWith('/login')) {
		goto('/login');
	}

	const isTauri = typeof (window as any).__TAURI__ !== 'undefined';
</script>

<main class="h-screen w-screen bg-gray-900">
	<Notifications>
		{#if isTauri}
			<TopBar />
		{/if}

		<div class="h-full w-full {isTauri ? 'pt-8' : ''}">
			<slot />
		</div>

		<VerificationModal />
	</Notifications>
</main>
