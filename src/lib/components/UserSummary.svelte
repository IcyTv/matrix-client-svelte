<script lang="ts">
	import { client } from '$lib/store';
	import { Headphones, MicrophoneFilled, User, Settings } from 'carbon-icons-svelte';

	$: userProfile = $client.getUser($client.getUserId()!);
</script>

<div class="absolute bottom-0 flex w-full flex-row items-center bg-gray-800 p-1 shadow-[0_-5px_5px_-5px] shadow-black">
	<div class="w- flex cursor-pointer flex-row rounded p-1 hover:bg-slate-700">
		{#if userProfile}
			<div class="relative h-10 w-10 rounded-full">
				{#if userProfile.avatarUrl}
					<img src={$client.mxcUrlToHttp(userProfile.avatarUrl)} class="h-10 w-10 rounded-full object-cover" alt="Profile" />
				{:else}
					<User class="h-10 w-10 rounded-full bg-slate-400" />
				{/if}

				<div class="absolute bottom-[-2px] right-[-2px] flex h-4 w-4 items-center justify-center rounded-full bg-slate-800">
					<div class="h-3 w-3 rounded-full bg-green-500" />
				</div>
			</div>
			<div class="mx-2 w-20">
				<p class="overflow-hidden text-ellipsis whitespace-nowrap font-bold">{userProfile.displayName}</p>
				<p class="overflow-hidden text-ellipsis whitespace-nowrap text-xs text-gray-400">{userProfile.userId}</p>
			</div>
		{:else}
			<div class="h-10 w-10 animate-pulse overflow-clip rounded-full bg-gray-600" />
			<div class="mx-2 w-16">
				<div class="h-4 w-16 animate-pulse overflow-hidden rounded-sm bg-gray-600 font-bold" />
				<div class="mt-2 h-2 w-16 animate-pulse overflow-hidden rounded-sm bg-gray-600 text-xs" />
			</div>
		{/if}
	</div>

	<button class="ml-auto flex h-8 w-8 items-center justify-center rounded p-2 hover:bg-slate-700">
		<MicrophoneFilled class="h-4 w-4" />
	</button>

	<button class="ml-auto flex h-8 w-8 items-center justify-center rounded p-2 hover:bg-slate-700">
		<Headphones class="h-4 w-4" />
	</button>

	<button class="ml-auto flex h-8 w-8 items-center justify-center rounded p-2 hover:bg-slate-700">
		<Settings class="h-4 w-4" />
	</button>
</div>
