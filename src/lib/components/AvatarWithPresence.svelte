<script lang="ts">
	import { client } from '$lib/store';
	import { UserEvent, type User } from 'matrix-js-sdk';
	import { onMount } from 'svelte';

	export let user: User;
	let clazz = '';
	export { clazz as class };

	$: user.on(UserEvent.Presence, (ev) => {
		console.log(ev);
	});
</script>

<div
	class="presence-avatar relative {clazz}"
	class:online={user.presence === 'online'}
	class:unavailable={user.presence === 'unavailable'}
	class:offline={user.presence === 'offline'}
>
	<img class={clazz} src={$client.mxcUrlToHttp(user.avatarUrl || '', 48, 48, 'scale', true)} alt="User Profile Picture for {user.displayName ?? user.userId}" />
</div>

<style>
	.presence-avatar::after {
		display: block;
		content: ' ';
		position: absolute;
		bottom: 0px;
		right: 0px;
		width: 1rem;
		height: 1rem;
		border-radius: 50%;

		border: 2px solid theme('colors.slate.700');
	}

	.presence-avatar.online::after {
		background-color: theme('colors.green.500');
	}

	.presence-avatar.unavailable::after {
		background-color: theme('colors.red.500');
	}

	.presence-avatar.offline::after {
		background-color: theme('colors.gray.500');
	}
</style>
