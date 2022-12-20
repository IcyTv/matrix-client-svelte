<script lang="ts">
	import AvatarWithPresence from '$lib/components/AvatarWithPresence.svelte';
	import DMs from '$lib/components/DMs.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Spinner from '$lib/components/Spinner.svelte';
	import UserSummary from '$lib/components/UserSummary.svelte';

	import { client, voiceCallSettings } from '$lib/store';
	import { EventType, User } from 'matrix-js-sdk';

	$: dms = $client?.getAccountData(EventType.Direct)?.getContent();

	$: friends = Object.keys(dms ?? {})
		.map((userId) => $client.getUser(userId))
		.filter((user) => user) as User[];
</script>

<Sidebar />

<div class="ml-16 flex h-full flex-row overflow-clip rounded-tl-xl bg-slate-700 text-white">
	{#if !$client}
		<div class="flex h-full w-full items-center justify-center">
			<Spinner />
		</div>
	{:else}
		<div class="relative flex h-full w-64 flex-shrink-0 select-none flex-col bg-slate-800 shadow-lg shadow-black">
			<DMs selectedRoomId="friends" />

			<UserSummary
				on:disconnect={() => {
					$voiceCallSettings.room = '';
					$voiceCallSettings.firstClick = true;
				}}
			/>
		</div>

		{#each friends as friend (friend.userId)}
			<div data-user-id={friend.userId} class="m-4 flex flex-row">
				<AvatarWithPresence user={friend} class="h-10 w-10 rounded-full" />
				<div class="text-lg">{friend.displayName ?? friend.userId}</div>
			</div>
		{/each}
	{/if}
</div>
