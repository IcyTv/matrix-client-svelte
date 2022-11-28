<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { fade, scale } from 'svelte/transition';

	const dispatch = createEventDispatcher();

	const devices = navigator.mediaDevices.getDisplayMedia({
		video: {},
	});
	devices.then((devices) => {
		console.log(devices);
		console.log(devices.getTracks());
	});
</script>

<div
	class="fixed inset-0 z-20 flex items-center justify-center bg-black bg-opacity-60"
	transition:fade
	on:click|self={() => dispatch('close')}
	on:keydown={(e) => {
		if (e.key === 'Escape') dispatch('close');
	}}
>
	<div transition:scale class="flex h-72 w-36 flex-col rounded bg-slate-700">
		<div>Select</div>
		<button on:click={() => dispatch('close')}>Close</button>
	</div>
</div>
