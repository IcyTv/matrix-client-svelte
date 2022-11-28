/// <reference types="../../app" />
import { writable, get } from 'svelte/store';
import { wireEventListeners, type JitsiEvents } from '$lib/utils/events';
import { createConferencesStore } from './conferenceStores';
import type JitsiConnection from '@solyd/lib-jitsi-meet/dist/esm/JitsiConnection';

JitsiMeetJS.setLogLevel(JitsiMeetJS.logLevels.WARN);

JitsiMeetJS.init({
	audioLevelsInterval: 40,
	disableAudioLevels: false,
} as any);

export enum ConnectionState {
	INITIAL = 'initial',
	CONNECTING = 'connecting',
	CONNECTED = 'connected',
	DISCONNECTED = 'disconnected',
	DISCONNECTING = 'disconnecting',
	FAILED = 'failed',
}

const CLEANUP_EVENT_LISTENERS_MAX_TIMEOUT = 4000;

// export const DEFAULT_JITSI_CONFIG = {
// 	hosts: {
// 		domain: 'meet.element.io',
// 		muc: 'conference.meet.element.io',
// 		focus: 'focus.meet.element.io',
// 	},
// 	externalConnectUrl: 'https://meet.element.io/http-pre-bind',
// 	enableP2P: false,
// 	p2p: {
// 		enabled: false,
// 		preferH264: true,
// 		disableH264: false,
// 		useStunTurn: true,
// 	},
// 	useStunTurn: false,
// 	// bosh: 'https://meet.element.io/http-bind', //need to add `room=[ROOM]` when joining
// 	// websocket: 'wss://meet.element.io/xmpp-websocket',
// 	serviceUrl: 'http://meet.element.io/http-bind',
// 	clientNode: 'http://jitsi.org/jitsimeet',
// };

const DEFAULT_JITSI_DOMAIN = 'meet.element.io';

export const DEFAULT_JITSI_CONFIG = {
	hosts: {
		domain: 'meet.jitsi',
		muc: `muc.meet.jitsi`,
	},
	focusUserJid: `focus@auth.meet.jitsi`,
	p2p: {
		enabled: false,
	},
	clientNode: 'https://jitsi.org/jitsimeet',
	websocket: `wss://${DEFAULT_JITSI_DOMAIN}/xmpp-websocket`,
	serviceUrl: `wss://${DEFAULT_JITSI_DOMAIN}/xmpp-websocket`,
	// serviceUrl: `https://${DEFAULT_JITSI_DOMAIN}/http-bind`,
	e2eping: {
		enabled: true,
	},
	enableWelcomePage: false,
	enableClosePage: false,
	prejoinConfig: {
		enabled: false,
	},
	flags: {
		sourceNameSignaling: true,
		sendMultipleVideoStreams: true,
		receiveMultipleVideoStreams: true,
	},
	disableAudioLevels: false,
};

/**
 * Create a ConnectionStore that holds a single JitsiConnection instance when connected,
 * or `null` otherwise.
 *
 * If the config inside `configStore` is null, then disconnect.
 *
 * @param configStore
 */

export function createConnectionStore(config: typeof DEFAULT_JITSI_CONFIG, room: string) {
	if (!config) {
		throw new Error('config is null');
	}
	config.serviceUrl += `?room=${room}`;
	// config.serviceUrl += `?room=${room}`;

	const stateStore = writable(ConnectionState.INITIAL);
	const qualityStore = writable(0);
	const store = writable<JitsiConnection | null>();
	//@ts-ignore
	const connection = new JitsiMeetJS.JitsiConnection(null, null, config);

	const setStatus = (state: ConnectionState) => {
		store.set(state === ConnectionState.CONNECTED ? connection : null);
		stateStore.set(state);
	};

	const events: JitsiEvents = {
		connection: {
			CONNECTION_ESTABLISHED: () => setStatus(ConnectionState.CONNECTED),
			CONNECTION_FAILED: () => setStatus(ConnectionState.FAILED),
			CONNECTION_DISCONNECTED: () => {
				wireEventListeners('remove', connection as any, events);
				setStatus(ConnectionState.DISCONNECTED);
			},
			WRONG_STATE: () => {
				console.error('WRONG_STATE');
				setStatus(ConnectionState.FAILED);
			},
			DISPLAY_NAME_REQUIRED: () => {
				console.error('DISPLAY_NAME_REQUIRED');
				setStatus(ConnectionState.FAILED);
			},
		},
		connectionQuality: {
			LOCAL_STATS_UPDATED: (stats: any) => {
				qualityStore.set(stats.connectionQuality);
			},
		},
	};

	wireEventListeners('add', connection as any, events);

	setStatus(ConnectionState.CONNECTING);
	// @ts-ignore
	connection.connect();

	const disconnect = () => {
		const $state = get(stateStore);
		if ($state === ConnectionState.CONNECTED || $state === ConnectionState.CONNECTING) {
			setStatus(ConnectionState.DISCONNECTING);
			connection
				.disconnect()
				.then(() => {
					setStatus(ConnectionState.DISCONNECTED);
				})
				.catch((err) => {
					console.error('disconnect error', err);
					setStatus(ConnectionState.DISCONNECTED);
				});

			setTimeout(() => wireEventListeners('remove', connection as any, events), CLEANUP_EVENT_LISTENERS_MAX_TIMEOUT);
		} else {
			wireEventListeners('remove', connection as any, events);
		}
	};

	const conferencesStore = createConferencesStore(store);
	return {
		subscribe: store.subscribe,
		state: stateStore,
		quality: qualityStore,
		conferences: conferencesStore,
		joinConference: (conferenceId: string) => conferencesStore.join(conferenceId),
		disconnect,
	};
}
