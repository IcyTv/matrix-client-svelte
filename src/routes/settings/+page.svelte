<script lang="ts">
	import { page } from '$app/stores';
	import CloseOutline from 'carbon-icons-svelte/lib/CloseOutline.svelte';
	import { scale } from 'svelte/transition';
	import LeftPane, { SettingsSubPage } from './LeftPane.svelte';
	import RightPane from './RightPane.svelte';

	let selected: SettingsSubPage = SettingsSubPage.Account;
</script>

{#key $page.routeId}
	<div in:scale={{ duration: 200 }} class="flex h-full w-full flex-row text-white">
		<div class="flex h-full w-[20%] flex-row justify-end bg-slate-700 p-4">
			<LeftPane bind:selected />
		</div>
		<div class="h-full w-[80%] bg-slate-600">
			<RightPane {selected} />
			<!-- svelte-ignore a11y-click-events-have-key-events -->
			<div class="absolute top-20 right-12 flex flex-col items-center" on:click={() => window.history.go(-1)}>
				<CloseOutline class="h-8 w-8 cursor-pointer text-slate-300 hover:text-white" />
				<p class="text-slate-300">ESC</p>
			</div>
		</div>
	</div>
{/key}
