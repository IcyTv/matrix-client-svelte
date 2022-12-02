<script lang="ts">
	import quotes from './quotes.txt?raw';
	import _ from 'underscore';
	import OauthButton from './OauthButton.svelte';
	import * as sdk from 'matrix-js-sdk';

	import Fa from 'svelte-fa';

	import { faGithub, faGoogle, faGitlab, faApple, faFacebook } from '@fortawesome/free-brands-svg-icons';
	import HomeserverDropdown from '$lib/components/HomeserverDropdown.svelte';
	import { client, exportedDeviceStore, userInfoStore } from '$lib/store';
	import Spinner from '$lib/components/Spinner.svelte';
	import { goto } from '$app/navigation';

	let quote = _.sample(quotes.split('\n'));

	let username: string;
	let password: string;
	let loading = false;

	interface ErrorMessages {
		username?: string;
		password?: string;
		total?: string;
	}

	let errors: ErrorMessages = {};

	const onLogin = async () => {
		if (!username) {
			errors.username = 'Please enter a username';
			return;
		} else {
			errors.username = undefined;
		}
		if (!password) {
			errors.password = 'Please enter a password';
			return;
		} else {
			errors.password = undefined;
		}

		loading = true;
		errors.total = undefined;

		$client
			.loginWithPassword(username, password)
			.then(async (res) => {
				$userInfoStore = {
					userId: res.user_id,
					deviceId: res.device_id,
					accessToken: res.access_token,
				};

				await goto('/', { replaceState: true });
			})
			.catch((e) => {
				console.error('Error', e);
				// Well known errors
				if (e.errcode === 'M_FORBIDDEN') {
					errors.total = 'Incorrect username or password';
				} else {
					errors.total = 'An unknown error occurred';
				}
			})
			.finally(() => {
				loading = false;
			});
	};
</script>

<div class="login-page relative flex h-full w-full items-center justify-center">
	<HomeserverDropdown class="absolute top-1 right-2 w-48 text-sm" />

	<div class="h-fit w-96 rounded-xl bg-gray-800 p-8 text-white shadow-lg">
		<h3 class="text-center text-lg">Welcome to the Matrix!</h3>
		<p class="break-normal text-center text-xs text-gray-400">{quote}</p>

		<!-- svelte-ignore a11y-positive-tabindex -->
		<form on:submit|preventDefault={onLogin} class="mt-4">
			<div class="my-2 w-full">
				<label for="username" class="mb-2 block text-sm font-bold text-gray-400">Username</label>
				<input
					bind:value={username}
					class="w-full rounded bg-gray-900 p-2 text-white shadow-md focus:outline focus:ring-2 focus:ring-purple-700 focus:ring-opacity-50"
					class:ring-1={errors.username}
					class:ring-red-500={errors.username}
					type="text"
					id="username"
					autocomplete="username"
					tabindex="1"
					disabled={loading}
				/>
				{#if errors.username}
					<p class="text-xs italic text-red-500">{errors.username}</p>
				{/if}
			</div>
			<div class="my-2 w-full">
				<label for="password" class="mb-2 block text-sm font-bold text-gray-400">Password</label>
				<input
					bind:value={password}
					class="w-full rounded bg-gray-900 p-2 text-white shadow-md focus:outline focus:ring-2 focus:ring-purple-700 focus:ring-opacity-50"
					class:ring-1={errors.password}
					class:ring-red-500={errors.password}
					type="password"
					id="password"
					autocomplete="current-password"
					tabindex="2"
					disabled={loading}
				/>
				{#if errors.password}
					<p class="text-xs italic text-red-500">{errors.password}</p>
				{/if}
			</div>

			{#if errors.total}
				<p class="text-xs italic text-red-500">{errors.total}</p>
			{/if}

			{#if loading}
				<Spinner />
			{:else}
				<div class="flex flex-row justify-center">
					<OauthButton to="github"><Fa icon={faGithub} class="!h-6 w-6" /></OauthButton>
					<OauthButton to="google"><Fa icon={faGoogle} class="!h-6 w-6" /></OauthButton>
					<OauthButton to="gitlab"><Fa icon={faGitlab} class="!h-6 w-6" /></OauthButton>
					<OauthButton to="facebook"><Fa icon={faFacebook} class="!h-6 w-6" /></OauthButton>
					<OauthButton to="apple"><Fa icon={faApple} class="!h-6 w-6" /></OauthButton>
				</div>
			{/if}

			<button class="my-3 w-full rounded bg-purple-700 p-2 text-white shadow-lg hover:bg-purple-600" type="submit" tabindex="3" disabled={loading}>Login</button>
		</form>
	</div>
</div>
