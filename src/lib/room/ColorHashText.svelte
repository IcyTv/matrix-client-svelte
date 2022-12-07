<script lang="ts">
	import ColorHash from 'color-hash';
	import { createEventDispatcher } from 'svelte';

	export let saturation: number = 1.0;
	export let lightnessBottom: number = 0.5;
	export let lightnessTop: number = 0.7;
	export let text: string = '';

	$: colorHash = new ColorHash({ saturation, lightness: [lightnessBottom, lightnessTop] });

	$: color = colorHash.hex(text);
</script>

<slot {color} />
