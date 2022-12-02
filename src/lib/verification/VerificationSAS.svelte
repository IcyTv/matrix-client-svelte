<script lang="ts">
	import type { DeviceInfo } from 'matrix-js-sdk/lib/crypto/deviceinfo';
	import type { IGeneratedSas } from 'matrix-js-sdk/lib/crypto/verification/SAS';
	import { createEventDispatcher } from 'svelte';

	export let displayName: string | null = null;
	export let device: DeviceInfo | null = null;
	export let sas: IGeneratedSas;
	export let isSelfVerification = false;

	const dispatch = createEventDispatcher();

	let isPending = false;
	let isCancelling = false;

	const onMatchClick = () => {
		isPending = true;
		dispatch('done');
	};

	const onDontMatchClick = () => {
		isCancelling = true;
		dispatch('cancel');
	};
</script>

{#if sas.emoji}
	{#each sas.emoji as emoji}
		<span class="text-5xl">{emoji[0]}</span>
		<!-- svelte-ignore a11y-label-has-associated-control -->
		<label class="text-sm text-slate-400">{emoji[1]}</label>
	{/each}

	{#if isSelfVerification}
		<p class="text-sm text-slate-300">Verify that the emoji match on both devices</p>
	{:else}
		<p class="text-sm text-slate-300">Verify this user by confirming they have the same emojis on screen.</p>
	{/if}
{:else if sas.decimal}
	{#each sas.decimal as decimal}
		<span class="text-5xl">{decimal}</span>
	{/each}

	{#if isSelfVerification}
		<p class="text-sm text-slate-300">Verify that the numbers match on both devices</p>
	{:else}
		<p class="text-sm text-slate-300">Verify this user by confirming they have the same numbers on screen.</p>
	{/if}
{:else}
	<p class="text-lg text-red-600">Unable to find a supported verification method...</p>
	<button class="rounded bg-slate-700 p-2" on:click={onDontMatchClick}>Cancel</button>
{/if}

{#if isPending && isSelfVerification}
	{#if device}
		<p class="text-sm">Waiting for you to verify on your other device, {device?.getDisplayName()} ({device?.deviceId})</p>
	{:else}
		<p class="text-sm">Waiting for you to verify on your other device</p>
	{/if}
{:else if isPending || isCancelling}
	<div class="flex flex-row gap-2">
		{#if displayName}
			<p>Waiting for {displayName} to verify</p>
		{:else}
			<p>Cancelling...</p>
		{/if}
	</div>
{:else}
	<div class="flex flex-row gap-2">
		<button class="rounded bg-slate-700 p-2" on:click={onMatchClick}>They Match</button>
		<button class="rounded bg-slate-700 p-2" on:click={onDontMatchClick}>They Don't match</button>
	</div>
{/if}

{#if !isSelfVerification}
	<p class="text-sn text-slate-300">To be secure, do this in person or use a trusted way to communicate.</p>
{/if}
