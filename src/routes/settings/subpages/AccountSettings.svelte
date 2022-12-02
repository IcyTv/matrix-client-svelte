<script lang="ts">
	import { client } from '$lib/store';
	import { UserAvatar } from 'carbon-icons-svelte';
	import ColorHash from 'color-hash';

	$: userProfile = $client?.getUser($client.getUserId()!);
	$: avatarUrl = $client?.mxcUrlToHttp(userProfile?.avatarUrl ?? '', 120, 120, 'scale');

	const colorHash = new ColorHash({ saturation: 1.0, lightness: [0.5, 0.7] });
	$: color = colorHash.hex(userProfile?.userId ?? '');
</script>

<h2 class="text-lg font-bold">My Account</h2>

<div class="overflow-clip rounded-xl bg-slate-800 pb-2">
	<div class="h-28 w-full bg-white" style="background-color: {color};" />
	<div class="flex items-center">
		{#if avatarUrl}
			<img src={avatarUrl} class="relative ml-4 -mt-6 h-24 w-24 rounded-full border-8 border-slate-800 bg-slate-800" alt="Profile" />
		{:else}
			<!-- <p class="relative ml-4 -mt-6 h-24 w-24 rounded-full border-8 border-slate-800 bg-white text-center text-4xl leading-[6rem] text-black">
				{userProfile?.displayName?.[0]}
			</p> -->
			<UserAvatar class="relative ml-4 -mt-6 h-24 w-24 rounded-full border-8 border-slate-800 bg-slate-800 text-white" />
		{/if}
		<h3 class="ml-4 select-none text-xl font-bold">{userProfile?.displayName}</h3>
		<p class="select-none text-lg font-light text-slate-400">{userProfile?.userId}</p>
	</div>

	<div class="m-4 overflow-clip rounded bg-gray-700">
		<p>Username</p>
	</div>
</div>
