<script lang="ts">
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { client } from '$lib/store';
</script>

<Sidebar />

<div class="ml-16 flex h-full flex-row overflow-clip rounded-tl-lg bg-slate-700 text-white">
	<p>Home</p>
</div>

<!-- TODO is there anything I event want to do here or can we just show a spinner and redirect? -->
