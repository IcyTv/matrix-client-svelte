<script lang="ts">
	export let tooltip: string;
	export let imageUrl: string = '';
	export let initials: string = '';
	export let selected: boolean = false;

	const SLOTS = $$props.$$slots;

	let classes = selected ? 'sidebar-icon-selected' : '';
</script>

<div on:click on:keypress class="{classes} sidebar-icon group select-none">
	{#if SLOTS}
		<div class="parent">
			<slot />
		</div>
	{:else if imageUrl}
		<img class="h-10 w-10" src={imageUrl} alt={tooltip} />
	{:else}
		<div class="flex h-10 w-10 flex-col items-center justify-center">
			<div class="text-2xl font-bold">{initials}</div>
		</div>
	{/if}

	<span class="sidebar-tooltip group-hover:scale-100">{tooltip}</span>
</div>

<style>
	.parent > :global(svg) {
		@apply h-8 w-8;
	}

	.sidebar-icon {
		@apply relative mx-auto mt-2 mb-2 flex h-12 w-12 cursor-pointer items-center justify-center
			rounded-3xl bg-gray-800 text-green-500 shadow-lg
			transition-all duration-300 ease-in-out hover:rounded-xl hover:bg-green-600 hover:text-white;
	}

	.sidebar-icon > :global(:not(.sidebar-tooltip)) {
		@apply flex h-12 w-12 items-center justify-center overflow-clip rounded-3xl
			object-cover transition-all duration-300 hover:rounded-xl;
	}

	.sidebar-icon-selected {
		@apply overflow-clip rounded-xl;
	}
</style>
