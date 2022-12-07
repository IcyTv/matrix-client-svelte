<script lang="ts">
	import { writable } from 'svelte/store';
	import Select from 'svelte-select';
	import { defaultDevices, selectedDevices, deviceList } from '$lib/jitsi/deviceListStore';
	import { onMount } from 'svelte';

	const mapDevice = (devices: MediaDeviceInfo[], kind: MediaDeviceKind) =>
		devices.filter((device) => device.kind === kind).map((device) => ({ label: device.label, value: device.deviceId }));

	$: inputDevices = mapDevice($deviceList, 'audioinput');
	$: outputDevices = mapDevice($deviceList, 'audiooutput');
	// $: videoDevices = devices.then((devices) => mapDevice(devices, 'videoinput'));

	interface Device {
		label: string;
		value: string;
	}

	let selectedInputDevice: Device | undefined;
	let selectedOutputDevice: Device | undefined;

	$: $selectedDevices.audioInput = selectedInputDevice?.value;
	$: $selectedDevices.audioOutput = selectedOutputDevice?.value;

	//TODO is onMount the right place to do this?
	onMount(async () => {
		deviceList.requery();

		selectedInputDevice =
			inputDevices.find((device) => device.value === $selectedDevices.audioInput) ?? inputDevices.find((device) => device.value === $defaultDevices.audioInput);
		selectedOutputDevice =
			outputDevices.find((device) => device.value === $selectedDevices.audioOutput) ?? outputDevices.find((device) => device.value === $defaultDevices.audioOutput);
	});

	const inputLevel = writable(100);
	const outputLevel = writable(100);
</script>

<h2 class="text-lg font-bold">Voice Settings</h2>

<div class="mt-4 grid grid-cols-2">
	<div class="themed-dropdown">
		<p class="text-sm text-slate-400">INPUT DEVICE</p>
		<Select items={inputDevices} bind:value={selectedInputDevice} isClearable={false} />
	</div>

	<div class="themed-dropdown">
		<p class="text-sm text-slate-400">OUTPUT DEVICE</p>
		<Select items={outputDevices} bind:value={selectedOutputDevice} isClearable={false} />
	</div>

	<div class="px-6 py-2">
		<p class="text-sm text-slate-400">INPUT VOLUME</p>
		<input type="range" min="0" max="100" class="w-full" bind:value={$inputLevel} />
	</div>
	<div class="px-6 py-2">
		<p class="text-sm text-slate-400">OUTPUT VOLUME</p>
		<input type="range" min="0" max="100" class="w-full" bind:value={$outputLevel} />
	</div>

	<div class="col-span-2 px-6">
		<p class="text-sm text-slate-400">MIC TEST</p>
		<p>Sorry, this is currently not implemented...</p>
	</div>
</div>

<div class="mx-6 h-px w-full bg-slate-500" />

<style>
	.themed-dropdown {
		@apply w-full cursor-pointer px-6;
		--background: theme('colors.slate.800');
		--listBackground: theme('colors.slate.800');
		--itemActiveBackground: theme('colors.slate.700');
		--border: 0;
		--itemHoverBG: theme('colors.slate.700');
		--inputFontSize: theme('fontSize.sm');
	}

	.themed-dropdown :global(input) {
		@apply !cursor-pointer;
	}

	.themed-dropdown :global(.listContainer) {
		@apply scrollbar-thin scrollbar-track-slate-800 scrollbar-thumb-slate-700 scrollbar-thumb-rounded-lg;
	}

	.themed-dropdown :global(.item) {
		@apply cursor-pointer;
	}
</style>
