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
	import { base32 } from 'rfc4648';
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';
	import { Buffer } from 'buffer';
	import { client, voiceCallSettings } from '$lib/store';

	export let room: Room;
	export let hidden: boolean = false;

	$: conferenceId = base32.stringify(Buffer.from(room.roomId), { pad: false });
	$: displayName = $client?.getUser($client.getUserId()!)?.displayName;
	$: email = $client?.getUserId()!;

	let jitsiParentNode: HTMLElement | null = null;

	$: accessToken = $client?.getAccessToken();
	$: serverName = $client?.getDomain();
	$: avatarUrlMxc = $client?.getUser($client.getUserId()!)?.avatarUrl;
	$: avatarUrl = $client?.mxcUrlToHttp(avatarUrlMxc!);

	let meetApi: any;

	const dispatch = createEventDispatcher<JitsiEvents>();

	console.log('Room events', room.currentState.events);

	$: widgetEvent = room.currentState.getStateEvents('im.vector.modular.widgets');
	$: console.log('Widget event', widgetEvent[0].getContent());
	$: widgetData = widgetEvent[0].getContent();
	$: console.assert(widgetData.type === 'jitsi', 'Widget type is not jitsi');

	$: ownEvent = room.currentState.getStateEvents('io.element.video.member', $client.getUserId()!);

	onMount(async () => {
		const jwt = createJwtToken(room.roomId, accessToken!, serverName, displayName!, avatarUrl!);
		const options = {
			width: '100%',
			height: '100%',
			parentNode: jitsiParentNode,
			devices: {
				// audioInput: null,
				// videoInput: null,
			},
			userInfo: {
				displayName,
				email,
			},
			roomName: widgetData.data.conferenceId,
			interfaceConfigOverwrite: {
				SHOW_JITSI_WATERMARK: false,
				SHOW_WATERMARK_FOR_GUESTS: false,
				MAIN_TOOLBAR_BUTTONS: [],
				VIDEO_LAYOUT_FIT: 'height',
				TILE_VIEW_MAX_COLUMNS: 5,
			},
			configOverwrite: {
				subject: room.name,
				startWithAudioMuted: $voiceCallSettings.muted,
				startWithVideoMuted: true,
				apiLogLevels: ['error'],
				prejoinConfig: {
					enabled: false,
				},
				toolbarButtons: ['microphone', 'camera', 'titleview', 'hangup', 'desktop'],
				conferenceInfo: {
					autoHide: [],
				},
				disableSelfViewSettings: true,
				disableTileView: false,
				enableWelcomePage: false,
				disableAudioLevels: false,
				logging: {
					logLevel: 'error',
				},
			},
			jwt,
		};
		console.log('Mounting JitsiConference', jitsiParentNode);
		meetApi = new JitsiMeetExternalAPI(JITSI_DOMAIN, options);

		const response = await $client.sendStateEvent(
			room.roomId,
			'io.element.video.member',
			{
				devices: [$client.deviceId],
				expires_ts: Date.now() + 1000 * 60 * 60,
			},
			ownEvent.getStateKey()
		);

		console.log('Response', response);

		dispatch('connect');

		meetApi.addEventListener('readyToClose', async () => {
			console.log('JitsiConference: readyToClose');
			const response = await $client.sendStateEvent(
				room.roomId,
				'io.element.video.member',
				{
					devices: [],
					expires_ts: Date.now() + 1000 * 60 * 60,
				},
				ownEvent.getStateKey()
			);
			console.log('Disconnect Response', response);
			dispatch('disconnect');
		});

		meetApi.addEventListener('videoConferenceJoined', () => {
			console.log('JitsiConference: videoConferenceJoined');

			meetApi.executeCommand('setTileView', {
				enabled: true,
			});
			meetApi.executeCommand('setNoiseSuppressionEnabled', {
				enabled: true,
			});
		});
	});

	$: if (meetApi) {
		if ($voiceCallSettings.muted && !meetApi.isAudioMuted()) {
			meetApi.executeCommand('toggleAudio');
		} else if (!$voiceCallSettings.muted && meetApi.isAudioMuted()) {
			meetApi.executeCommand('toggleAudio');
		}
	}

	onDestroy(async () => {
		console.log('Unmounting JitsiConference');
		const response = await $client.sendStateEvent(
			room.roomId,
			'io.element.video.member',
			{
				devices: [],
				expires_ts: Date.now() + 1000 * 60 * 60,
			},
			ownEvent.getStateKey()
		);
		console.log('Disconnect Response', response);
		if (meetApi) {
			meetApi.dispose();
		}
	});
</script>

<svelte:head>
	<!-- TODO generate our own... -->
	<script src="https://meet.jit.si/external_api.js"></script>
</svelte:head>

<div class="h-full w-full" bind:this={jitsiParentNode} class:hidden />
