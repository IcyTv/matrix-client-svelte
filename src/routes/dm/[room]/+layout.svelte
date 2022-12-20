<script lang="ts">
	import { page } from '$app/stores';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Spinner from '$lib/components/Spinner.svelte';
	import UserSummary from '$lib/components/UserSummary.svelte';
	import { client, voiceCallSettings } from '$lib/store';
	import DMs from '$lib/components/DMs.svelte';

	$: roomId = $page.params.room;
</script>

<Sidebar />

<div class="ml-16 flex h-full flex-row overflow-clip rounded-tl-xl bg-slate-700 text-white">
	{#if !$client}
		<div class="flex h-full w-full items-center justify-center">
			<Spinner />
		</div>
	{:else}
		<div class="relative flex h-full w-64 flex-shrink-0 select-none flex-col bg-slate-800 shadow-lg shadow-black">
			<DMs selectedRoomId={roomId} />

			<UserSummary
				on:disconnect={() => {
					$voiceCallSettings.room = '';
					$voiceCallSettings.firstClick = true;
				}}
			/>
		</div>

		<slot />
	{/if}
</div>
