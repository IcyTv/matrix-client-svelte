<script lang="ts">
	import { writable, type Writable } from 'svelte/store';

	export let error: Writable<Error | null> = writable(null);
	export let onError: ((error: Error) => void) | null = null;

	let ENV = typeof process !== 'undefined' && process.env && process.env.NODE_ENV;
	let DEV = ENV !== 'production';

	$: if ($error && onError) onError($error);
</script>

{#if $error}
	<div class="flex h-screen w-screen items-center justify-center">
		<div class="border-x-2 border-y-2 border-red-800">
			<p class="font-bold text-red-400">{$error.message}</p>
			<pre class="font-mono text-white">
			{DEV ? $error.stack : ''}
	  	</pre>
		</div>
	</div>
{:else}
	<slot />
{/if}
