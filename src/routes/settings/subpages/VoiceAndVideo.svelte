<script lang="ts">
	import { writable } from 'svelte/store';

	let devices = navigator.mediaDevices.enumerateDevices();
	$: inputDevices = devices.then((devices) => devices.filter((device) => device.kind === 'audioinput'));
	$: outputDevices = devices.then((devices) => devices.filter((device) => device.kind === 'audiooutput'));
	$: videoDevices = devices.then((devices) => devices.filter((device) => device.kind === 'videoinput'));
</script>

<h2 class="text-lg font-bold">Voice Settings</h2>

<div class="mt-4 flex flex-row">
	<div class="flex flex-col">
		{#await inputDevices then input}
			<p class="text-sm text-slate-400">INPUT DEVICE</p>
			<select class="text-black">
				{#each input as inp}
					<option value={inp.deviceId}>{inp.label}</option>
				{/each}
			</select>
		{/await}
	</div>
</div>
