<script lang="ts">
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Spinner from '$lib/components/Spinner.svelte';
	import UserSummary from '$lib/components/UserSummary.svelte';
	import { client } from '$lib/store';

	let timeoutTriggered = false;
	let timeout = setTimeout(() => {
		timeoutTriggered = true;
	}, 10000);

	$: if ($client !== null) {
		clearTimeout(timeout);
	}
</script>

<Sidebar />

<div class="ml-16 flex h-full flex-row items-center justify-center overflow-clip rounded-tl-lg bg-slate-700 text-white">
	{#if $client !== null}
		<div class="h-full w-full">
			<!-- TODO move to seperate component...-->
			<div class="relative z-10 flex h-full w-64 flex-shrink-0 select-none flex-col bg-slate-800 shadow-lg shadow-black">
				<div class="flex-grow" />

				<UserSummary />
			</div>
		</div>
	{:else}
		<div class="flex flex-col items-center">
			<p class="text-lg">Loading...</p>
			<Spinner />

			{#if timeoutTriggered}
				<p class="text-lg text-red-800">Synchronizing with the server is taking longer than expected...</p>
			{/if}
		</div>
	{/if}
</div>
