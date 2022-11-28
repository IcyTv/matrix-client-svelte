<script lang="ts">
	import { voiceCallSettings } from '$lib/store';
	import { Camera, MicrophoneFilled, MicrophoneOffFilled, PhoneBlockFilled, PhoneOffFilled, Screen } from 'carbon-icons-svelte';
	import { createEventDispatcher } from 'svelte';
	import { fly } from 'svelte/transition';
	import Participant from './Participant.svelte';
	import ShareScreenModal from './ShareScreenModal.svelte';

	export let conferenceId: string;
	export let conference: any;
	export let permitEntry = false;
	export let ownId = '';

	const participants = conference.participants;

	const dispatch = createEventDispatcher();

	$: conference.permitEntry(permitEntry);

	$: focused = Object.values($participants).find((p: any) => !!p.desktop);

	let isShareScreenModalOpen = false;
</script>

<div data-conference-id={conferenceId} class="group h-full bg-black px-8 py-2">
	<div class="flex h-[calc(100%-4em)] flex-grow flex-row flex-wrap items-center">
		{#each Object.entries($participants) as [id, participant], key}
			<Participant {participant} focused={focused === participant} isSelf={ownId === id} />
		{/each}
	</div>

	<div class="flex flex-grow-0 origin-bottom scale-0 items-center justify-center gap-4 transition-all delay-500 duration-200 group-hover:scale-100 group-hover:delay-[0ms]">
		<button class="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 transition-colors duration-75 hover:bg-slate-600">
			<Camera class="h-6 w-6" />
		</button>
		<button
			class="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 transition-colors duration-75 hover:bg-slate-600"
			on:click={() => (isShareScreenModalOpen = true)}
		>
			<Screen class="h-6 w-6" />
		</button>
		<button
			class="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 transition-colors duration-75 hover:bg-slate-600"
			on:click={() => ($voiceCallSettings.muted = !$voiceCallSettings.muted)}
		>
			{#if $voiceCallSettings.muted}
				<MicrophoneOffFilled class="h-6 w-6" />
			{:else}
				<MicrophoneFilled class="h-6 w-6" />
			{/if}
		</button>
		<button class="flex h-12 w-12 items-center justify-center rounded-full bg-red-700 transition-colors duration-75 hover:bg-red-500" on:click={() => dispatch('leave')}>
			<PhoneBlockFilled class="h-6 w-6" />
		</button>
	</div>

	{#if isShareScreenModalOpen}
		<ShareScreenModal on:close={() => (isShareScreenModalOpen = false)} />
	{/if}
</div>
