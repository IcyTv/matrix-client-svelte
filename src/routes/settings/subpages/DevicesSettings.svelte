<script lang="ts">
	import { myDeviceStore, deviceListStore } from '$lib/stores/deviceList';
	import Device from '../components/Device.svelte';
</script>

<h1 class="text-lg font-bold">Devices</h1>

<p class="text-slate-300">Here are all the devices you are signed into and their encryption support.</p>

<h3 class="pt-2">Current Device</h3>

{#if $myDeviceStore}
	<Device device={$myDeviceStore} class="rounded" />
{/if}

<h3 class="pt-2">Other devices</h3>

{#if $deviceListStore}
	<div class="overflow-clip rounded">
		{#each $deviceListStore as dev}
			<Device device={dev} />
		{/each}
	</div>
{/if}
