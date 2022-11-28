<script lang="ts" context="module">
	import { KJUR } from 'jsrsasign';

	declare let JitsiMeetExternalAPI: any;

	const JITSI_DOMAIN = 'meet.element.io';

	//TODO there is definitely a way to do this with typescript magic (i.e. only have connect,disconnect,... instead of 'jitsi:connect',...), but I don't know how
	export interface JitsiEvents {
		disconnect: {};
		connect: {};
	}

	const createJwtToken = (roomId: string, accessToken: string, serverName: string, displayName: string, avatarUrl?: string) => {
		const header = { alg: 'HS256', typ: 'JWT' };
		const payload = {
			iss: JITSI_DOMAIN,
			sub: JITSI_DOMAIN,
			aud: `https://${JITSI_DOMAIN}`,
			room: '*',
			context: {
				matrix: {
					room_id: roomId,
					// token: token.access_token,
					// server_name: token.matrix_server_name,
					token: accessToken,
					server_name: serverName,
				},
				user: {
					avatar: avatarUrl,
					displayName: displayName,
				},
			},
		};

		return KJUR.jws.JWS.sign('HS256', JSON.stringify(header), JSON.stringify(payload), 'notused');
	};
</script>

<script lang="ts">
	import type { Room } from 'matrix-js-sdk';
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';
	import { client, voiceCallSettings, jitsiConnection } from '$lib/store';
	import { createConnectionStore, DEFAULT_JITSI_CONFIG } from '$lib/jitsi/connectionStore';
	import Conference from '$lib/jitsi/components/Conference.svelte';
	import { localTracksStore } from '$lib/jitsi/localTrackStores';
	import type TrackVADEmitter from '@solyd/lib-jitsi-meet/dist/esm/modules/detection/TrackVADEmitter';
	import _ from 'underscore';

	export let room: Room;
	export let hidden: boolean = false;

	$: displayName = $client?.getUser($client.getUserId()!)?.displayName;
	$: email = $client?.getUserId()!;

	let deafened = false;

	$: accessToken = $client?.getAccessToken();
	$: serverName = $client?.getDomain();
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
	$: participants = currentConference?.participants;

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
		<Conference {conferenceId} {conference} permitEntry={true} ownId={$currentConference?.myUserId()} />
	{/each}
</div>
