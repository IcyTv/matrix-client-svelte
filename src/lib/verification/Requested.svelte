<script lang="ts">
	import type { VerificationRequest } from 'matrix-js-sdk/lib/crypto/verification/request/VerificationRequest';
	import { verificationStore } from '$lib/store';

	export let request: VerificationRequest;
</script>

{#if request.isSelfVerification}
	Someone is trying to verify this device... Is that you?
{:else}
	{request.otherUserId} is trying to verify this device...
{/if}

<div class="flex flex-row justify-between">
	<button
		class="rounded bg-blue-400 p-2"
		on:click={() => {
			verificationStore.ready();
		}}
	>
		{#if $verificationStore.request?.isSelfVerification}
			Yes
		{:else}
			Accept
		{/if}
	</button>
	<button
		class="rounded bg-slate-400 p-2"
		on:click={() => {
			$verificationStore.request?.cancel();
			verificationStore.reset();
		}}>Cancel</button
	>
</div>
