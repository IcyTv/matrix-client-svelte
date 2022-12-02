<script lang="ts" context="module">
	export interface JitsiEvents {
		disconnect: {};
		connect: {};
	}
</script>

<script lang="ts">
	import type { Room } from 'matrix-js-sdk';
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';
	import { client, voiceCallSettings, jitsiConnection } from '$lib/store';
	import Conference from '$lib/jitsi/components/Conference.svelte';
	import { localTracksStore } from '$lib/jitsi/localTrackStores';

	export let room: Room;
	export let hidden: boolean = false;

	$: displayName = $client?.getUser($client.getUserId()!)?.displayName;
	$: email = $client?.getUserId()!;

	let deafened = false;

	$: avatarUrlMxc = $client?.getUser($client.getUserId()!)?.avatarUrl;
	$: avatarUrl = $client?.mxcUrlToHttp(avatarUrlMxc!);

	const dispatch = createEventDispatcher<JitsiEvents>();

	$: widgetEvent = room.currentState.getStateEvents('im.vector.modular.widgets');
	$: widgetData = widgetEvent[0].getContent();
	$: console.assert(widgetData.type === 'jitsi', 'Widget type is not jitsi');
	$: conferenceId = widgetData.data.conferenceId;
	$: jitsiConferenceId = conferenceId.toLowerCase();

	$: console.log('Conference ID', conferenceId);

	$: ownEvent = room.currentState.getStateEvents('io.element.video.member', $client.getUserId()!);
	$: currentDeviceList = ownEvent?.getContent().devices ?? [];

	// const connection = createConnectionStore(DEFAULT_JITSI_CONFIG, jitsiConferenceId);
	$: conferences = jitsiConnection.conferences;

	$: currentConference = $conferences[jitsiConferenceId];
	$: localParticipant = currentConference?.localParticipant;

	$: if ($currentConference) {
		$currentConference.setDisplayName(displayName!);
		$currentConference.sendCommandOnce('avatar-url', {
			value: avatarUrl,
			attributes: {},
			children: [],
		});
	}

	onMount(async () => {
		conferences.join(jitsiConferenceId);
		if (!$localTracksStore?.audio) {
			localTracksStore.request({
				requestedTracks: ['audio'],
				selectedDevices: {},
			});
		}

		const newDevices = currentDeviceList.concat([$client.getDeviceId()]);
		const response = await $client.sendStateEvent(
			room.roomId,
			'io.element.video.member',
			{
				devices: newDevices,
				expires_ts: Date.now() + 1000 * 60 * 60,
			},
			ownEvent.getStateKey()
		);
	});
	onDestroy(() => {
		conferences.leave(jitsiConferenceId);
		// TODO when do we disconnect?

		localTracksStore.clear();

		const newDevices = currentDeviceList.filter((device: string) => device !== $client.getDeviceId());
		const response = $client.sendStateEvent(
			room.roomId,
			'io.element.video.member',
			{
				devices: [],
				expires_ts: Date.now() + 1000 * 60 * 60,
			},
			ownEvent.getStateKey()
		);
	});

	$: if ($localParticipant && ($voiceCallSettings.muted || $voiceCallSettings.deafened) && $localParticipant.audioEnabled) {
		localParticipant.setAudioEnabled(false);
	} else if ($localParticipant && !$voiceCallSettings.muted && !$voiceCallSettings.deafened && !$localParticipant.audioEnabled) {
		localParticipant.setAudioEnabled(true);
	}

	$: if ($voiceCallSettings.deafened && !deafened) {
		document.querySelectorAll('.participant-audio').forEach((el) => {
			(el as HTMLAudioElement).muted = true;
		});
		deafened = true;
		//TODO this is a hack, we should be able to do this in the stores to mute newly joined participants etc
	} else if (!$voiceCallSettings.deafened && deafened) {
		document.querySelectorAll('.participant-audio').forEach((el) => {
			(el as HTMLAudioElement).muted = false;
		});
		deafened = false;
	}
</script>

<div class="h-full w-full" class:hidden>
	{#each Object.entries($conferences) as [conferenceId, conference], key}
		<Conference {conferenceId} {conference} permitEntry={true} ownId={$currentConference?.myUserId()} on:leave={() => dispatch('disconnect')} />
	{/each}
</div>
