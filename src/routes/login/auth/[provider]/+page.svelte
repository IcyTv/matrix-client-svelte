<script lang="ts">
	import { page } from '$app/stores';
	import _, { has } from 'underscore';
	import Fa from 'svelte-fa';
	import { invoke } from '@tauri-apps/api';

	import { client } from '$lib/store';

	import * as sdk from 'matrix-js-sdk';

	let provider = $page.params.provider;
	import { faGithub, faGoogle, faGitlab, faApple, faFacebook, type IconDefinition } from '@fortawesome/free-brands-svg-icons';
	import { goto } from '$app/navigation';

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

	async function openRedirect() {
		let redirectUrl = $client?.getSsoLoginUrl('REDIRECT', 'sso', providers[provider].ipdId);

		let token = (await invoke('login_redirect', { link: redirectUrl })) as string;
		let response = await $client?.loginWithToken(token);

		let store = new sdk.IndexedDBStore({
			indexedDB: window.indexedDB,
			dbName: 'sesion',
			localStorage: window.localStorage,
		});
		await store.startup();

		client.cache.set(
			sdk.createClient({
				baseUrl: $client!.baseUrl,
				accessToken: response.access_token,
				userId: response.user_id,
				deviceId: response.device_id,
				store: store,
				cryptoStore: new sdk.IndexedDBCryptoStore(window.indexedDB, 'matrix-js-sdk:crypto'),
			})
		);

		await $client!.initCrypto();
		await $client!.startClient();

		const exportedDevice = await $client!.exportDevice();
		exportedDevice.olmDevice.sessions = exportedDevice.olmDevice.sessions.filter((s) => !!s);

		window.localStorage.setItem(
			'session',
			JSON.stringify({
				accessToken: response.access_token,
				exportedDevice,
			})
		);

		await goto('/', { replaceState: true });
	}
</script>

<div class="flex h-full w-full flex-col items-center justify-center bg-gray-800 text-white">
	{#if !_.has(providers, provider)}
		<p class="text-red-400">Unknown Oauth Provider...</p>
		<a href="/login" class="text-blue-400">Go back</a>
	{:else}
		<div class="flex h-32 w-32 items-center justify-center">
			<Fa icon={providers[provider]?.icon} scale="5x" />
		</div>

		<p>Waiting for <span class="capitalize">{provider}</span> to redict you to back to the app...</p>
		<p class="text-gray-400">If you are not redirected automatically, please clicke the button below</p>

		<button on:click={openRedirect} class="group m-4 flex h-10 w-32 items-center justify-center rounded-lg bg-gray-700 text-white shadow-lg hover:bg-purple-700"
			>Open Browser</button
		>
		<a href="/login">Cancel</a>
	{/if}
</div>
