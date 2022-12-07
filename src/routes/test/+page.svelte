<script lang="ts">
	import { client } from '$lib/store';
	import ClientLoaded from './ClientLoaded.svelte';
</script>

{#if $client}
	<ClientLoaded />
{:else}
	<p class="text-white">Loading...</p>
{/if}
