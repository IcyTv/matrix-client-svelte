<script lang="ts">
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { page } from '$app/stores';
	import { client, voiceCallSettings } from '$lib/store';
	import Spinner from '$lib/components/Spinner.svelte';
	import ServerHeader from '$lib/components/ServerHeader.svelte';
	import { RoomState, RoomStateEvent, type MatrixEvent, type Room } from 'matrix-js-sdk';
	import Hashtag from 'carbon-icons-svelte/lib/Hashtag.svelte';
	import UserSummary from '$lib/components/UserSummary.svelte';
	import { User, VolumeUpFilled } from 'carbon-icons-svelte';

	import { slide, fade } from 'svelte/transition';
	import { getUsersInCall } from '$lib/utils/call';
	import { onDestroy, onMount } from 'svelte';

	import JitsiConference from '$lib/components/JitsiConference.svelte';

	let roomId: string;
	$: roomId = $page.params.room;
	$: room = $client?.getRoom(roomId);
	$: children = Promise.all(
		room?.currentState.getStateEvents('m.space.child')?.map((event) => {
			return $client?.getRoom(event.getStateKey());
		}) || []
	).then((rooms) => rooms.filter((room) => !!room)) as Promise<Room[]>;

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
				console.log('Preventing first click');
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

		console.log('Updated members', roomMembers);
	};

	onMount(() => {
		children.then((children) => {
			for (const child of children) {
				if (child.isElementVideoRoom()) {
					child.on(RoomStateEvent.Update, onStateUpdated(child));
				}

				onStateUpdated(child)(child.currentState);
			}
		});
	});

	onDestroy(() => {
		children.then((children) => {
			for (const child of children) {
				if (child.isElementVideoRoom()) {
					child.off(RoomStateEvent.Update, onStateUpdated(child));
				}
			}
		});
	});

	$: currentVoiceRoom = $voiceCallSettings.room && $client?.getRoom($voiceCallSettings.room);
	$: console.log('Got Current Voice Room', currentVoiceRoom, 'Is current?', $voiceCallSettings.room === currentlySelected, $voiceCallSettings.room, currentlySelected);
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

			{#await children}
				<div class="h-8 rounded mx-2 mb-2 bg-slate-600 animate-pulse" />
				<div class="h-8 rounded mx-2 mb-2 bg-slate-600 animate-pulse" />
				<div class="h-8 rounded mx-2 mb-2 bg-slate-600 animate-pulse" />
				<div class="h-8 rounded mx-2 mb-2 bg-slate-600 animate-pulse" />
			{:then c}
				{#each c.filter((c) => !c.isSpaceRoom()) as child}
					<div class="flex flex-col">
						<a
							class="flex flex-row items-center mx-2 mb-1 rounded shadow-slate-800 transition-all duration-75 cursor-pointer hover:bg-slate-700 hover:shadow 
							{currentlySelected == child.roomId ? 'bg-slate-700' : ''}"
							href={`/rooms/${roomId}/${child.roomId}`}
							on:click={onChannelClick(child)}
						>
							{#if child.isCallRoom() || child.isElementVideoRoom()}
								<VolumeUpFilled class="w-8 h-8 p-2" />
							{:else}
								<Hashtag class="w-8 h-8 p-2" />
							{/if}
							<p>{child.name}</p>
						</a>

						{#each (roomMembers[child.roomId] ?? []).sort((a, b) => a.displayName.localeCompare(b.displayName)) as member}
							<div class="flex flex-row items-center ml-10 hover:bg-slate-600 p-1 rounded mr-2 cursor-pointer" transition:slide={{ duration: 150 }}>
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
			{/await}

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
