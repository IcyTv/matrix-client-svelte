<script lang="ts">
	import { client } from '$lib/store';
	import { Devices } from 'carbon-icons-svelte';
	import type { IMyDevice } from 'matrix-js-sdk';

	export let device: IMyDevice;
	let clazz = '';
	export { clazz as class };

	const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
		month: 'short',
		day: 'numeric',
		year: '2-digit',
		hour: 'numeric',
		minute: 'numeric',
		formatMatcher: 'best fit',
	});

	$: lastSeen = dateTimeFormatter.format(device.last_seen_ts);

	$: trustLevel = $client.checkDeviceTrust($client.getUserId()!, device.device_id);
	$: isVerified = trustLevel.isVerified();
</script>

<div class="group flex gap-4 bg-slate-700 p-2 hover:bg-slate-800 {clazz}">
	<div class="h-12 w-12 rounded-full bg-slate-800 p-2 group-hover:bg-slate-700">
		<Devices class="h-8 w-8 {isVerified ? 'text-green-400' : 'text-red-500'}" />
	</div>
	<div class="flex flex-col">
		<p class="font-bold">{device.display_name ?? device.device_id}</p>
		<div>
			<p>{device.device_id} - {lastSeen} - {device.last_seen_ip}</p>
		</div>
	</div>
</div>
