<script lang="ts">
	import quotes from './quotes.txt?raw';
	import _ from 'underscore';
	import OauthButton from './OauthButton.svelte';

	import Fa from 'svelte-fa';

	import { faGithub, faGoogle, faGitlab, faApple, faFacebook } from '@fortawesome/free-brands-svg-icons';

	let quote = _.sample(quotes.split('\n'));
</script>

<div class="login-page flex h-full w-full items-center justify-center">
	<div class="h-fit w-96 rounded-xl bg-gray-800 p-8 text-white shadow-lg">
		<h3 class="text-center text-lg">Welcome to the Matrix!</h3>
		<p class="break-normal text-center text-xs text-gray-400">{quote}</p>

		<!-- svelte-ignore a11y-positive-tabindex -->
		<form on:submit|preventDefault class="mt-4">
			<div class="my-2 w-full">
				<label for="username" class="mb-2 block text-sm font-bold text-gray-400">Username</label>
				<input
					class="w-full rounded bg-gray-900 p-2 text-white shadow-md focus:outline focus:ring-2 focus:ring-purple-700 focus:ring-opacity-50"
					type="text"
					id="username"
					autocomplete="username"
					tabindex="1"
				/>
			</div>
			<div class="my-2 w-full">
				<label for="password" class="mb-2 block text-sm font-bold text-gray-400">Password</label>
				<input
					class="w-full rounded bg-gray-900 p-2 text-white shadow-md focus:outline focus:ring-2 focus:ring-purple-700 focus:ring-opacity-50"
					type="password"
					id="password"
					autocomplete="current-password"
					tabindex="2"
				/>
			</div>

			<div class="flex flex-row justify-center">
				<OauthButton to="github"><Fa icon={faGithub} class="!h-6 w-6" /></OauthButton>
				<OauthButton to="google"><Fa icon={faGoogle} class="!h-6 w-6" /></OauthButton>
				<OauthButton to="gitlab"><Fa icon={faGitlab} class="!h-6 w-6" /></OauthButton>
				<OauthButton to="facebook"><Fa icon={faFacebook} class="!h-6 w-6" /></OauthButton>
				<OauthButton to="apple"><Fa icon={faApple} class="!h-6 w-6" /></OauthButton>
			</div>

			<button class="my-3 w-full rounded bg-purple-700 p-2 text-white shadow-lg hover:bg-purple-600" type="submit" tabindex="3">Login</button>
		</form>
	</div>
</div>
