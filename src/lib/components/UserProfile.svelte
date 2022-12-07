<script lang="ts">
	import { client } from '$lib/store';
	import UserAvatar from 'carbon-icons-svelte/lib/UserAvatar.svelte';
	import ColorHash from 'color-hash';
	import type { Room } from 'matrix-js-sdk';

	export let userId: string;
	export let room: Room;
	export let roomImage: string;

	$: user = $client.getUser(userId);

	const colorHash = new ColorHash({ saturation: 1.0, lightness: [0.5, 0.7] });
	$: color = colorHash.hex(userId);

	$: avatar = $client.mxcUrlToHttp(user?.avatarUrl ?? '', 96, 96, 'scale');

	$: roomJoinTime = room.getMember(userId)?.membership === 'join' ? room.getMember(userId)?.events.member?.getTs() : null;

	$: powerLevel = room.getMember(userId)?.powerLevel;

	const df = new Intl.DateTimeFormat('en', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	});

	let clazz: string = '';
	export { clazz as class };
</script>

<div class="{clazz} z-10 h-fit w-96 overflow-clip rounded-lg bg-slate-800 pb-2 shadow-lg shadow-black">
	<div class="h-12 w-full" style="background-color: {color};" />
	<div class="group relative -mt-8 ml-4 mr-auto h-24 w-24 rounded-full">
		<div
			class="absolute inset-0 hidden h-24 w-24 cursor-pointer items-center justify-center rounded-full border-[6px] border-transparent bg-black bg-opacity-70 text-sm group-hover:flex"
		>
			View Profile
		</div>
		<!-- TODO improve detection of when we're loaded. I just assume that we always get a Room join Time -->
		{#if avatar}
			<img src={avatar} class="h-24 w-24 rounded-full border-[6px] border-slate-800 bg-slate-800" alt="profile" />
		{:else}
			<UserAvatar class="h-24 w-24 rounded-full border-[6px] border-slate-800 bg-slate-800" />
		{/if}
		<div class="absolute bottom-0 right-0 h-8 w-8 rounded-full border-[6px] border-slate-800 bg-green-500" />
	</div>
	<div class="m-2 rounded-md bg-slate-900 p-2">
		<p class="text-xl font-medium" class:animate-pulse={!user} class:bg-gray-600={!user}>{user?.displayName}</p>
		<p class="text-sm text-slate-400" class:animate-pulse={!user} class:bg-gray-600={!user}>{user?.userId}</p>
		<div class="my-2 h-px w-full bg-slate-700" />
		<p class="text-sm font-bold uppercase">MEMBER SINCE</p>
		<div class="flex flex-row items-center gap-2">
			<img src={roomImage} class="inline h-4 w-4 rounded-full object-contain" alt="Room" />
			<p class="text-sm text-slate-400" class:animate-pulse={!roomJoinTime} class:bg-gray-600={!roomJoinTime}>
				{roomJoinTime ? df.format(roomJoinTime) : 'Unknown'}
			</p>
		</div>
		<div class="mt-2 text-sm font-bold">POWERLEVEL</div>
		<div class="text-sm text-slate-400" class:animate-pulse={(!user || !powerLevel) && !roomJoinTime} class:bg-gray-600={(!user || !powerLevel) && !roomJoinTime}>
			{powerLevel}
		</div>

		<div class="mt-2 text-sm font-bold">NOTE</div>
		<p class="text-sm text-gray-500">Click to add a note</p>

		<input
			class="mt-4 w-full rounded border-none bg-slate-900 p-2 text-sm ring-1 ring-slate-700 focus:outline-none focus:ring-slate-500"
			placeholder="Message @{user?.displayName}"
		/>
	</div>
</div>
