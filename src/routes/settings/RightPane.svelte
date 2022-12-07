<script lang="ts">
	import { SettingsSubPage } from './LeftPane.svelte';
	import AccountSettings from './subpages/AccountSettings.svelte';
	import CryptographySettings from './subpages/CryptographySettings.svelte';
	import DevicesSettings from './subpages/DevicesSettings.svelte';
	import VoiceAndVideo from './subpages/VoiceAndVideo.svelte';

	export let selected: SettingsSubPage;
</script>

<div class="ml-4 mr-20 mt-20">
	{#if selected === SettingsSubPage.Account}
		<AccountSettings />
	{:else if selected === SettingsSubPage.Voice}
		<VoiceAndVideo />
	{:else if selected === SettingsSubPage.Devices}
		<DevicesSettings />
	{:else if selected === SettingsSubPage.Cryptography}
		<CryptographySettings />
	{/if}
</div>
