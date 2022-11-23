<script lang="ts">
	import { client } from '$lib/store';
	import { CryptoEvent } from 'matrix-js-sdk/lib/crypto';
	import type { VerificationRequest } from 'matrix-js-sdk/lib/crypto/verification/request/VerificationRequest';
	import { onDestroy, onMount } from 'svelte';
	import { fade } from 'svelte/transition';

	let request: VerificationRequest | null = null;

	const onVerificationRequest = (req: VerificationRequest) => {
		request = req;
	};

	$: $client?.on(CryptoEvent.VerificationRequest, onVerificationRequest);

	onDestroy(() => {
		$client?.off(CryptoEvent.VerificationRequest, onVerificationRequest);
	});
</script>

{#if request && request.isSelfVerification}
	<div
		class="absolute inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-900 bg-opacity-50"
		transition:fade
		on:click={() => {
			request?.cancel();
			request = null;
		}}
		on:keydown={(event) => {
			if (event.key === 'Escape') {
				request?.cancel();
				request = null;
			}
		}}
	>
		<div class="rounded bg-slate-500 p-4 text-white">
			<h2>Verify This Device</h2>
			<p class="text-sm text-slate-300">There has been a request to verify your device</p>

			<p>Target device: {request.targetDevice?.deviceId ?? 'Unknown'}</p>
			<p>Initiator: {request.verifier?.deviceId ?? 'Unknown'}</p>

			<button
				class="rounded bg-red-400 p-2"
				on:click={() => {
					request?.cancel();
					request = null;
				}}>Cancel</button
			>
			<button
				class="rounded bg-green-400 p-2"
				on:click={() => {
					request?.accept();
					request = null;
				}}>Accept</button
			>
		</div>
	</div>
{/if}
