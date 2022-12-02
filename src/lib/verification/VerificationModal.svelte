<script lang="ts">
	import { client, verificationStore } from '$lib/store';
	import type { IMyDevice } from 'matrix-js-sdk';
	import { verificationMethods } from 'matrix-js-sdk/lib/crypto';
	import type { DeviceInfo } from 'matrix-js-sdk/lib/crypto/deviceinfo';
	import { QrCodeEvent, SCAN_QR_CODE_METHOD } from 'matrix-js-sdk/lib/crypto/verification/QRCode';
	import { Phase, VerificationRequestEvent } from 'matrix-js-sdk/lib/crypto/verification/request/VerificationRequest';
	import { SasEvent, type ISasEvent, type SAS } from 'matrix-js-sdk/lib/crypto/verification/SAS';
	import { onDestroy, onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import Requested from './Requested.svelte';
	import VerificationSas from './VerificationSAS.svelte';

	$: console.log('VerificationStore', verificationStore);
	$: console.log('$VerificationStore', $verificationStore);

	$: showSAS = $verificationStore.request?.otherPartySupportsMethod(verificationMethods.SAS);
	$: showQR = $verificationStore.request?.otherPartySupportsMethod(SCAN_QR_CODE_METHOD);

	let isEmojiButtonClicked = false;
	const startSAS = async () => {
		isEmojiButtonClicked = true;
		const verifier = $verificationStore.request?.beginKeyVerification(verificationMethods.SAS);
		try {
			await verifier!.verify();
		} catch (e) {
			console.error(e);
		}
	};

	let hasVerifier = false;
	let sasEvent: ISasEvent;

	$: device = $client.getStoredDevice($client.getUserId()!, $verificationStore.request?.channel.deviceId || '');

	const updateVerifierState = () => {
		const request = $verificationStore.request;
		if (request?.verifier) {
			const sasEv = (request.verifier as SAS).sasEvent;
			request.verifier.off(SasEvent.ShowSas, updateVerifierState);
			request.verifier.off(QrCodeEvent.ShowReciprocateQr, updateVerifierState);
			sasEvent = sasEv;
		}
	};

	const onRequestChange = async () => {
		const request = $verificationStore.request;
		const hadVerifier = hasVerifier;
		hasVerifier = !!request?.verifier;
		if (!hadVerifier && hasVerifier) {
			request?.verifier.on(SasEvent.ShowSas, updateVerifierState);
			request?.verifier.on(QrCodeEvent.ShowReciprocateQr, updateVerifierState);
			try {
				await request?.verifier.verify();
			} catch (e) {
				console.error(e);
			}
		}
	};

	$: if ($verificationStore.request) {
		const request = $verificationStore.request;
		request.on(VerificationRequestEvent.Change, onRequestChange);
		if (request.verifier) {
			sasEvent = (request.verifier as SAS).sasEvent;
		}
		onRequestChange();
	}

	onDestroy(() => {
		if ($verificationStore.request) {
			$verificationStore.request.off(VerificationRequestEvent.Change, onRequestChange);
			if ($verificationStore.request.verifier) {
				$verificationStore.request.verifier.off(SasEvent.ShowSas, updateVerifierState);
				$verificationStore.request.verifier.off(QrCodeEvent.ShowReciprocateQr, updateVerifierState);
			}
		}
	});
</script>

{#if $verificationStore.request}
	<div
		class="absolute inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-900 bg-opacity-50 text-white"
		transition:fade
		on:click={() => {
			// verificationStore;
		}}
		on:keydown={(event) => {
			if (event.key === 'Escape') {
				// request?.cancel();
				// request = null;
			}
		}}
	>
		<div class="flex flex-col rounded bg-slate-700 p-6">
			Verify this device by completing one of the following:
			{#if $verificationStore.phase === Phase.Requested}
				<Requested request={$verificationStore.request} />
			{:else if $verificationStore.phase === Phase.Ready}
				{#if showQR}
					<p class="text-red-500">Currently, QR codes are unsupported!</p>
				{/if}

				{#if showQR && showSAS}
					<p>or</p>
				{/if}

				{#if showSAS}
					<div>
						<p>Compare Unique Emoji</p>
						<span class="text-sm text-slate-300">Compare a unique set of emoji if you don't have a camera on either device</span>
						<button disabled={isEmojiButtonClicked} on:click={startSAS} class="rounded bg-blue-500 py-2 px-4 font-bold text-white hover:bg-blue-700"> Start </button>
					</div>
				{/if}
			{:else if $verificationStore.phase === Phase.Started}
				{#if $verificationStore.request?.chosenMethod === verificationMethods.RECIPROCATE_QR_CODE}
					<p class="text-red-500">QR Verification is currently unsupported...</p>
				{:else if $verificationStore.request?.chosenMethod === verificationMethods.SAS}
					<VerificationSas
						sas={sasEvent.sas}
						displayName={$verificationStore.request?.otherUserId}
						{device}
						on:cancel={() => sasEvent.mismatch()}
						on:done={() => sasEvent.confirm()}
						isSelfVerification={$verificationStore.request?.isSelfVerification}
					/>
				{/if}
			{:else if $verificationStore.phase === Phase.Done}
				<p>Verification complete!</p>
			{:else if $verificationStore.phase === Phase.Cancelled}
				<p>Verification cancelled!</p>
			{/if}
		</div>
	</div>
{/if}
