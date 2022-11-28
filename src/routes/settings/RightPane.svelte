<script lang="ts">
	import { SettingsSubPage } from './LeftPane.svelte';
	import AccountSettings from './subpages/AccountSettings.svelte';
	import VoiceAndVideo from './subpages/VoiceAndVideo.svelte';

	export let selected: SettingsSubPage;
</script>

<div class="ml-4 mr-20 mt-20">
	{#if selected === SettingsSubPage.Account}
		<AccountSettings />
	{:else if selected === SettingsSubPage.Voice}
		<VoiceAndVideo />
	{/if}
</div>
