<script lang="ts">
	import { Hashtag } from 'carbon-icons-svelte';

	export let roomName: string;
</script>

<div class="flex flex-col items-start gap-1 p-8">
	<div class="w-fit rounded-full bg-slate-600 p-2">
		<Hashtag class="h-12 w-12" />
	</div>

	<h1 class="text-3xl font-bold">Welcome to #{roomName}!</h1>
	<p class="text-slate-400">This is the start of the #{roomName} channel.</p>
</div>
