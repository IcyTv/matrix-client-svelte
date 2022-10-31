<script lang="ts">
	import type { Room } from 'matrix-js-sdk';
	import { ChevronDown } from 'carbon-icons-svelte';

	export let room: Room;

	let clazz: string;
	export { clazz as class };
</script>

<div class="relative flex cursor-pointer items-center justify-between p-2 pl-4 text-lg font-bold shadow-[0_2px_2px_-1px] shadow-slate-900 hover:bg-slate-700 {clazz}">
	{room.name}
	<ChevronDown />
</div>
