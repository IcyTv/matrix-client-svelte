<script lang="ts">
	import { page } from '$app/stores';
	import _, { has } from 'underscore';
	import Fa from 'svelte-fa';
	import { invoke } from '@tauri-apps/api';

	import { client, exportedDeviceStore, userInfoStore } from '$lib/store';

	import * as sdk from 'matrix-js-sdk';

	let provider = $page.params.provider;
	import { faGithub, faGoogle, faGitlab, faApple, faFacebook, type IconDefinition } from '@fortawesome/free-brands-svg-icons';
	import { goto } from '$app/navigation';
	import Spinner from '$lib/components/Spinner.svelte';
	import { ClientEvent } from 'matrix-js-sdk';

	const providers: {
		[key: string]: {
			icon: IconDefinition;
			ipdId: string;
		};
	} = {
		github: {
			icon: faGithub,
			ipdId: 'oidc-github',
		},
		google: {
			icon: faGoogle,
			ipdId: 'oidc-google',
		},
		gitlab: {
			icon: faGitlab,
			ipdId: 'oidc-gitlab',
		},
		facebook: {
			icon: faFacebook,
			ipdId: 'oidc-facebook',
		},
		apple: {
			icon: faApple,
			ipdId: 'oidc-apple',
		},
	};

	let loading = false;

	$: loginToken = $page.url.searchParams.get('loginToken');

	$: if (loginToken && $client) {
		initClient(loginToken);
	}

	const isTauri = typeof (window as any).__TAURI__ !== 'undefined';

	const initClient = async (token: string) => {
		loading = true;

		let response = await $client!.loginWithToken(token);

		$userInfoStore = {
			accessToken: response.access_token,
			userId: response.user_id,
			deviceId: response.device_id,
		};

		await goto('/', { replaceState: true });
		// window.location.reload();
	};

	let openRedirect: () => Promise<void>;

	if (isTauri) {
		openRedirect = async () => {
			let redirectUrl = $client?.getSsoLoginUrl('REDIRECT', 'sso', providers[provider].ipdId);

			let token = (await invoke('login_redirect', { link: redirectUrl })) as string;
			console.log('Token: ', token);

			await initClient(token);
		};
	} else if (!loginToken) {
		openRedirect = async () => {
			let redirectUrl = $client?.getSsoLoginUrl(window.location.href, 'sso', providers[provider].ipdId);
			// goto(redirectUrl, { replaceState: false });
			window.location.href = redirectUrl!;
		};
	}
</script>

<div class="flex h-full w-full flex-col items-center justify-center bg-gray-800 text-white">
	{#if !_.has(providers, provider)}
		<p class="text-red-400">Unknown Oauth Provider...</p>
		<a href="/login" class="text-blue-400">Go back</a>
	{:else}
		<div class="flex h-32 w-32 items-center justify-center">
			{#if !loading}
				<Fa icon={providers[provider]?.icon} scale="5x" />
			{:else}
				<Spinner class="h-16 w-16" />
			{/if}
		</div>

		<p>
			{#if isTauri}
				Waiting for <span class="capitalize">{provider}</span> to redict you to back to the app...
			{:else}
				Redirecting you to <span class="capitalize">{provider}</span>...
			{/if}
		</p>
		<p class="text-gray-400">If you are not redirected automatically, please clicke the button below</p>

		<button on:click={openRedirect} class="group m-4 flex h-10 w-32 items-center justify-center rounded-lg bg-gray-700 text-white shadow-lg hover:bg-purple-700">
			{#if isTauri}
				Open Browser
			{:else}
				Continue
			{/if}
		</button>
		<a href="/login">Cancel</a>
	{/if}
</div>
