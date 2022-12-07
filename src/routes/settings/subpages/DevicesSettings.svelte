<script lang="ts">
	import { client } from '$lib/store';
	import Device from '../components/Device.svelte';

	$: thisDevice = $client.getDevice($client.getDeviceId());

	$: otherDevices = $client.getDevices();
</script>

<h1 class="text-lg font-bold">Devices</h1>

<p class="text-slate-300">Here are all the devices you are signed into and their encryption support.</p>

<h3 class="pt-2">Current Device</h3>

{#await thisDevice then dev}
	<Device device={dev} class="rounded" />
{/await}

<h3 class="pt-2">Other devices</h3>

{#await otherDevices then other}
	<div class="rounded overflow-clip">
		{#each other.devices as dev}
			<Device device={dev} />
		{/each}
	</div>
{/await}
