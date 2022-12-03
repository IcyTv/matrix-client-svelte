<script lang="ts">
	import { homeserverStore } from '$lib/store';
	import { CheckmarkOutline, ErrorOutline, Information } from 'carbon-icons-svelte';
	import Select from 'svelte-select';

	let clazz = '';
	export { clazz as class };

	let homeserverIsValid = false;
	$: homeservers = [{ value: 'matrix.org', label: 'matrix.org' }, $homeserverStore !== 'matrix.org' && { value: $homeserverStore, label: $homeserverStore }].filter(Boolean);

	$: selectedHomeserver = {
		value: $homeserverStore,
		label: $homeserverStore,
	};

	let loading = true;

	const testHomeserver = async (homeserver: string) => {
		try {
			const res = await fetch(`https://${homeserver}/_matrix/client/versions`);
			if (res.ok) {
				return true;
			} else {
				return false;
			}
		} catch (e) {
			return false;
		}
	};

	$: testHomeserver(selectedHomeserver.value).then((res) => {
		homeserverIsValid = res;
		loading = false;
	});

	function handleHomeserverSelect(event: CustomEvent<{ value: string; label: string }>) {
		$homeserverStore = event.detail.value;
		loading = true;
	}
</script>

<div class="homeserver-select-wrapper {clazz}">
	<label for="homeserver-select" class="text-xs text-gray-300">Homeserver</label>
	<div class="relative">
		<Select items={homeservers} value={selectedHomeserver} on:select={handleHomeserverSelect} isClearable={false} isCreatable id="homeserver-select" />
		<div class="absolute inset-0 left-auto flex items-center justify-center pr-2">
			{#if loading}
				<Information class="h-4 w-4 text-blue-300" />
			{:else if homeserverIsValid}
				<CheckmarkOutline class="h-4 w-4 text-green-400" />
			{:else}
				<ErrorOutline class="h-4 w-4 text-red-400" />
			{/if}
		</div>
	</div>
</div>

<style>
	.homeserver-select-wrapper {
		--background: theme('colors.gray.800');
		--border: 0;
		--inputColor: theme('colors.white');
	}

	.homeserver-select-wrapper :global(.selection) {
		@apply text-white;
	}
</style>
