<script lang="ts">
	import { client, voiceCallSettings } from '$lib/store';
	import { JOIN_ROOM_AUDIO_SRC, playAudio } from '$lib/utils/audio';
	import PhoneFilled from 'carbon-icons-svelte/lib/PhoneFilled.svelte';
	import type { Room } from 'matrix-js-sdk';
	import { CallErrorCode, CallEvent } from 'matrix-js-sdk/lib/webrtc/call';
	import { CallEventHandlerEvent } from 'matrix-js-sdk/lib/webrtc/callEventHandler';
	import { onDestroy } from 'svelte';
	import { getNotificationsContext } from 'svelte-notifications';

	const { addNotification } = getNotificationsContext();

	export let room: Room;
	let clazz: string = '';
	export { clazz as class };

	$: call = $client.createCall(room.roomId);

	const onError = (error: Error) => {
		console.error(error);
		addNotification({
			title: 'Error',
			message: error.message,
			level: 'error',
		});
	};

	const onCallEvent = (event: any) => {
		addNotification({
			type: 'info',
			title: 'Call event',
			message: event,
		});
	};

	$: {
		call?.on(CallEvent.Error, onError);
		call?.on(CallEvent.State, onCallEvent);
	}

	$: $client.on(CallEventHandlerEvent.Incoming, onCallEvent);

	const onCall = () => {
		if ($voiceCallSettings.room == room.roomId) {
			return;
		}

		if (!call) {
			return;
		}

		call.placeCall(true, false)
			.catch(onError)
			.then(() => {
				console.log('Call placed');
			});

		$voiceCallSettings.room = room.roomId;
		$voiceCallSettings.call = call;
		playAudio(JOIN_ROOM_AUDIO_SRC);
	};

	onDestroy(() => {
		call?.hangup(CallErrorCode.UserHangup, false);
		call?.off(CallEvent.Error, onError);
		call?.off(CallEvent.State, onCallEvent);
		$client.off(CallEventHandlerEvent.Incoming, onCallEvent);
	});
</script>

<button on:click={onCall} class="{clazz} ">
	<PhoneFilled class="h-5 w-5 text-gray-400 hover:text-white" />
</button>
