<script lang="ts">
	import { client } from '$lib/store';
	import { CheckboxCheckedFilled, CloseOutline } from 'carbon-icons-svelte';

	$: isCrossSigningEnabled = $client.isCrossSigningReady();

	$: sessionId = $client.getDeviceId();

	function formatCryptoKey(key: string): string {
		return key.match(/.{1,4}/g)!.join(' ');
	}

	$: cryptoKey = $client.getDeviceEd25519Key();
	$: deviceInfo = $client.getStoredDevice($client.getUserId()!, $client.getDeviceId());
</script>

<h2 class="text-lg font-bold">Cryptography</h2>

<h3 class="pt-4 font-bold">Cross-Signing</h3>

{#await isCrossSigningEnabled then isCross}
	{#if isCross}
		<p><CheckboxCheckedFilled class="inline w-4 h-4 text-green-500" /> Cross signing is Enabled</p>
	{:else}
		<p><CloseOutline class="inline w-4 h-4 text-red-500" /> Cross signing is not Enabled</p>
	{/if}
{/await}

<h3 class="pt-4 font-bold">Details</h3>

<p>Session ID: <span>{sessionId}</span></p>
<p>Session Key: <span class="font-mono text-sm font-semibold">+{formatCryptoKey(cryptoKey)}</span></p>
