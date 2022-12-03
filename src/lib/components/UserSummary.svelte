<script lang="ts">
	import { page } from '$app/stores';
	import { client, jitsiConnection, voiceCallSettings } from '$lib/store';
	import { JOIN_ROOM_AUDIO_SRC as UNMUTE_AUDIO_SRC, LEAVE_ROOM_AUDIO_SRC as MUTE_AUDIO_SRC, playAudio } from '$lib/utils/audio';
	import Headphones from 'carbon-icons-svelte/lib/Headphones.svelte';
	import MicrophoneFilled from 'carbon-icons-svelte/lib/MicrophoneFilled.svelte';
	import User from 'carbon-icons-svelte/lib/User.svelte';
	import Settings from 'carbon-icons-svelte/lib/Settings.svelte';
	import Wifi from 'carbon-icons-svelte/lib/Wifi.svelte';
	import PhoneBlockFilled from 'carbon-icons-svelte/lib/PhoneBlockFilled.svelte';

	import { createEventDispatcher } from 'svelte';
	import { slide } from 'svelte/transition';

	interface CallEvents {
		disconnect: {};
	}

	const dispatch = createEventDispatcher<CallEvents>();

	$: userProfile = $client.getUser($client.getUserId()!);

	$: room = $client.getRoom($voiceCallSettings.room ?? '');
	$: rootSpaceId = $page.params.room;
	$: rootSpace = $client.getRoom(rootSpaceId);
</script>

<!--shadow-[0_-5px_5px_-5px] shadow-black-->
<div class="absolute bottom-0 flex w-full flex-col items-center border-t-2 border-t-slate-900 bg-gray-800 p-1">
	{#if !!$voiceCallSettings.room && !!room}
		<div class="flex w-full flex-row px-2 pb-2 pt-1" transition:slide={{ duration: 150 }}>
			<div class="flex w-full flex-shrink flex-col">
				<div class="flex flex-row items-center">
					<Wifi class="mr-1 h-6 w-6 text-green-500" />
					<p class="text-xs font-bold text-green-500">Voice Connected</p>
				</div>

				<p class="text-xs text-slate-400">{room.name} / {rootSpace?.name}</p>
			</div>

			<button
				on:click={() => {
					dispatch('disconnect');
				}}
			>
				<PhoneBlockFilled class="h-6 w-6 text-slate-300" />
			</button>
		</div>

		<div class="h-px w-full bg-slate-700" />
	{/if}

	<div class="flex flex-row items-center">
		<div class="w- flex cursor-pointer flex-row rounded p-1 transition-colors duration-150 hover:bg-slate-700">
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

		<button
			class="relative ml-auto flex h-8 w-8 items-center justify-center rounded p-2 hover:bg-slate-700 {$voiceCallSettings.muted || $voiceCallSettings.deafened
				? 'crossed-out'
				: ''}"
			on:click={() => {
				if ($voiceCallSettings.muted) {
					playAudio(UNMUTE_AUDIO_SRC);
				} else {
					playAudio(MUTE_AUDIO_SRC);
				}
				$voiceCallSettings.muted = !$voiceCallSettings.muted;
			}}
		>
			<MicrophoneFilled class="h-4 w-4 " />
		</button>

		<button
			class="relative ml-auto flex h-8 w-8 items-center justify-center rounded p-2 hover:bg-slate-700 {$voiceCallSettings.deafened ? 'crossed-out' : ''}"
			on:click={() => {
				if ($voiceCallSettings.deafened) {
					playAudio(UNMUTE_AUDIO_SRC);
				} else {
					playAudio(MUTE_AUDIO_SRC);
				}
				$voiceCallSettings.deafened = !$voiceCallSettings.deafened;
			}}
		>
			<Headphones class="h-4 w-4" />
		</button>

		<a href="/settings" class="ml-auto flex h-8 w-8 items-center justify-center rounded p-2 hover:bg-slate-700">
			<Settings class="h-4 w-4" />
		</a>
	</div>
</div>
