<script lang="ts" context="module">
	export enum SettingsSubPage {
		Account = 'account',
		Profiles = 'profiles',
		Devices = 'devices',
		Voice = 'voice',
	}
</script>

<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import SelectorButton from './SelectorButton.svelte';

	interface Events {
		selected: SettingsSubPage;
	}

	const dispatch = createEventDispatcher<Events>();

	export let selected: SettingsSubPage = SettingsSubPage.Account;
	$: dispatch('selected', selected);
</script>

<div class="flex w-48 flex-col justify-start">
	<div class="h-16 w-px" />

	<p class="mx-2 select-none px-2 text-sm font-extrabold text-slate-400">USER SETTINGS</p>
	<SelectorButton page={SettingsSubPage.Account} {selected} on:click={() => (selected = SettingsSubPage.Account)}>My Account</SelectorButton>
	<SelectorButton page={SettingsSubPage.Profiles} {selected} on:click={() => (selected = SettingsSubPage.Profiles)}>Profiles</SelectorButton>
	<SelectorButton page={SettingsSubPage.Devices} {selected} on:click={() => (selected = SettingsSubPage.Devices)}>Devices</SelectorButton>

	<div class="my-1 mx-4 h-px bg-slate-600" />
	<p class="mx-2 select-none px-2 text-sm font-extrabold text-slate-400">APP SETTINGS</p>
	<SelectorButton page={SettingsSubPage.Voice} {selected} on:click={() => (selected = SettingsSubPage.Voice)}>Voice & Video</SelectorButton>
</div>
