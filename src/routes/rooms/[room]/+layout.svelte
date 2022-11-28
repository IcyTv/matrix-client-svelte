<script lang="ts">
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { page } from '$app/stores';
	import { client, voiceCallSettings } from '$lib/store';
	import Spinner from '$lib/components/Spinner.svelte';
	import ServerHeader from '$lib/components/ServerHeader.svelte';
	import { RoomState, RoomStateEvent, type MatrixEvent, type Room } from 'matrix-js-sdk';
	import Hashtag from 'carbon-icons-svelte/lib/Hashtag.svelte';
	import User from 'carbon-icons-svelte/lib/User.svelte';
	import VolumeUpFilled from 'carbon-icons-svelte/lib/VolumeUpFilled.svelte';
	import UserSummary from '$lib/components/UserSummary.svelte';
	// import { User, VolumeUpFilled } from 'carbon-icons-svelte';

	import { slide, fade } from 'svelte/transition';
	import { getUsersInCall } from '$lib/utils/call';
	import { onDestroy, onMount } from 'svelte';

	import JitsiConference from '$lib/components/JitsiConference.svelte';
	import { flip } from 'svelte/animate';
	import _ from 'underscore';
	import { list } from 'postcss';

	let roomId: string;
	$: roomId = $page.params.room;
	$: room = $client?.getRoom(roomId);
	$: children = room?.currentState
		.getStateEvents('m.space.child')
		?.map((event) => {
			return $client?.getRoom(event.getStateKey());
		})
		.filter((room) => !!room) as Room[] | undefined;

	$: currentlySelected = $page.params.channel;
	$: userProfile = $client?.getUser($client.getUserId()!);

	$: $voiceCallSettings.call && console.log('UsersInCall', getUsersInCall($voiceCallSettings.call), room?.currentState);

	let roomMembers: {
		[roomId: string]: {
			id: string;
			avatarUrl: string;
			displayName: string;
		}[];
	} = {};

	const onChannelClick = (room: Room) => (e: MouseEvent) => {
		if (room.isElementVideoRoom()) {
			if ($voiceCallSettings.firstClick) {
				e.preventDefault();
			}
			$voiceCallSettings.firstClick = false;
			$voiceCallSettings.room = room.roomId;
		}
	};

	const onStateUpdated = (room: Room) => (roomState: RoomState) => {
		roomMembers[room.roomId] = [];
		const events = roomState.getStateEvents('io.element.video.member');
		for (const memberEvent of events) {
			const sender = memberEvent.getSender();
			const user = $client?.getUser(sender);

			const content = memberEvent.getContent();
			if (content.devices && content.devices.length > 0) {
				roomMembers[room.roomId].push({
					id: memberEvent.getStateKey()!,
					avatarUrl: $client.mxcUrlToHttp(user?.avatarUrl!)!,
					displayName: user?.displayName || memberEvent.getStateKey()!,
				});
			}
		}

		roomMembers[room.roomId].sort((a, b) => a.displayName.localeCompare(b.displayName));
	};

	$: if (children) {
		for (const child of children) {
			child.off(RoomStateEvent.Update, onStateUpdated(child));
			if (child.isElementVideoRoom()) {
				child.on(RoomStateEvent.Update, onStateUpdated(child));
			}

			onStateUpdated(child)(child.currentState);
		}
	}

	$: currentVoiceRoom = $voiceCallSettings.room && $client?.getRoom($voiceCallSettings.room);
</script>

<svelte:head>
	<script src="https://meet.jit.si/external_api.js"></script>
</svelte:head>

<Sidebar />

<div class="ml-16 flex h-full flex-row overflow-clip rounded-tl-xl bg-slate-700 text-white">
	{#if !room || !$client}
		<div class="flex h-full w-full items-center justify-center">
			<Spinner />
		</div>
	{:else}
		<div class="relative z-10 flex h-full w-64 flex-shrink-0 select-none flex-col bg-slate-800 shadow-lg shadow-black">
			<ServerHeader bind:room class="mb-4" />

			<!-- {#await children}
				<div class="h-8 rounded mx-2 mb-2 bg-slate-600 animate-pulse" />
				<div class="h-8 rounded mx-2 mb-2 bg-slate-600 animate-pulse" />
				<div class="h-8 rounded mx-2 mb-2 bg-slate-600 animate-pulse" />
				<div class="h-8 rounded mx-2 mb-2 bg-slate-600 animate-pulse" />
			{:then c} -->
			{#each children?.filter((c) => !c.isSpaceRoom()) ?? [] as child}
				<div class="flex flex-col">
					<a
						class="mx-2 mb-1 flex cursor-pointer flex-row items-center rounded shadow-slate-800 transition-all duration-75 hover:bg-slate-700 hover:shadow 
							{currentlySelected == child.roomId ? 'bg-slate-700' : ''}"
						href={`/rooms/${roomId}/${child.roomId}`}
						on:click={onChannelClick(child)}
					>
						{#if child.isCallRoom() || child.isElementVideoRoom()}
							<VolumeUpFilled class="h-8 w-8 p-2" />
						{:else}
							<Hashtag class="h-8 w-8 p-2" />
						{/if}
						<p>{child.name}</p>
					</a>

					{#each roomMembers[child.roomId] as member, key (member.id)}
						<div class="ml-10 mr-2 flex cursor-pointer flex-row items-center rounded p-1 hover:bg-slate-600" in:slide={{ duration: 150 }} animate:flip>
							<div class="relative h-6 w-6 rounded-full">
								{#if member.avatarUrl}
									<img src={member.avatarUrl} class="h-6 w-6 rounded-full object-cover" alt="Profile" />
								{:else}
									<User class="h-6 w-6 rounded-full" />
								{/if}
							</div>

							<p class="mx-2 text-sm text-slate-300">{member.displayName}</p>
						</div>
					{/each}
				</div>
			{/each}
			<!-- {/await} -->

			<UserSummary
				on:disconnect={() => {
					$voiceCallSettings.room = '';
					$voiceCallSettings.firstClick = true;
				}}
			/>
		</div>

		<slot />

		{#if $voiceCallSettings.room && currentVoiceRoom}
			<JitsiConference
				room={currentVoiceRoom}
				hidden={currentlySelected != $voiceCallSettings.room}
				on:disconnect={() => {
					$voiceCallSettings.room = '';
					$voiceCallSettings.firstClick = true;
				}}
			/>
		{/if}
	{/if}
</div>
