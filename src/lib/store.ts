import { writable, derived, get, readable, type Writable } from 'svelte/store';
import * as sdk from 'matrix-js-sdk';

import { ClientEvent, EventType, IndexedDBStore, MatrixEvent, RoomEvent, type Room } from 'matrix-js-sdk';
import type { MatrixCall } from 'matrix-js-sdk/lib/webrtc/call';
import { createConnectionStore, DEFAULT_JITSI_CONFIG } from './jitsi/connectionStore';
import { CryptoEvent, verificationMethods } from 'matrix-js-sdk/lib/crypto';
import { Phase, VerificationRequestEvent, type VerificationRequest } from 'matrix-js-sdk/lib/crypto/verification/request/VerificationRequest';
import { persist, createLocalStorage, createCookieStorage } from '@macfja/svelte-persistent-store';
import _ from 'underscore';
import type { IExportedDevice } from 'matrix-js-sdk/lib/crypto/OlmDevice';

// export const accessTokenStore = persist(writable<string | undefined>(undefined), createCookieStorage(), 'accessToken');

export const userInfoStore = persist(writable<any>(undefined), createCookieStorage(), 'userInfo');

const storeStore = readable<IndexedDBStore | null>(null, (set) => {
	const store = new sdk.IndexedDBStore({
		indexedDB: window.indexedDB,
		dbName: 'session',
		localStorage: window.localStorage,
	});
	store.startup().then(() => {
		set(store);
	});
	return () => {};
});

export const recentEmojiStore = writable<[string, number][]>([]);

export const client = derived(
	[userInfoStore, storeStore],
	([$userInfo, $store], set) => {
		if (!$store) return;

		let exportedDevice = get(exportedDeviceStore);

		let client = sdk.createClient({
			baseUrl: 'https://matrix.org',
			// timelineSupport: true,
			store: $store,
			cryptoStore: new sdk.IndexedDBCryptoStore(window.indexedDB, 'matrix-js-sdk:crypto'),
			accessToken: $userInfo?.accessToken,
			deviceToImport: exportedDevice,
			localTimeoutMs: 10000,
			userId: $userInfo?.userId,
			deviceId: $userInfo?.deviceId,
		});

		const onAccountData = (event: MatrixEvent) => {
			if (event.getType() === 'io.element.recent_emoji') {
				recentEmojiStore.set(event.getContent().recent_emoji);
			}
		};

		client.on(ClientEvent.AccountData, onAccountData);

		(async () => {
			if ($userInfo?.accessToken) {
				await client.initCrypto();
				const prom = new Promise((resolve, reject) => {
					client.once(ClientEvent.Sync, resolve);
					client.once(ClientEvent.SyncUnexpectedError, reject);
				});
				await client.startClient({
					pendingEventOrdering: sdk.PendingEventOrdering.Detached,
				});
				await prom;
				client.setGlobalErrorOnUnknownDevices(false);

				const exportedDevice = await client.exportDevice();
				exportedDevice.olmDevice.sessions = exportedDevice.olmDevice.sessions.filter((s) => !!s);

				exportedDeviceStore.set(exportedDevice);
			}

			set(client);
		})();

		return () => {
			client.off(ClientEvent.AccountData, onAccountData);
			client.stopClient();
		};
	},
	//TODO remove
	null as unknown as sdk.MatrixClient
);

export const isLoggedIn = derived([client], ([$client], set) => {
	const updateLogin = () => {
		set($client?.isLoggedIn());
	};

	$client?.on(ClientEvent.Sync, updateLogin);
	$client?.on(ClientEvent.SyncUnexpectedError, updateLogin);
	set($client?.isLoggedIn());

	return () => {
		$client?.off(ClientEvent.Sync, updateLogin);
		$client?.off(ClientEvent.SyncUnexpectedError, updateLogin);
	};
});
const MISMATCHES = ['m.key_mismatch', 'm.user_error', 'm.mismatched_sas'];

interface VerificationStore {
	request?: VerificationRequest;
	accepted?: boolean;
	isRequesting: boolean;
	phase?: Phase;
}

const createVerificationStore = () => {
	const store = writable<VerificationStore>({
		isRequesting: false,
	});

	client.subscribe(($client) => {
		if (!$client) return;

		const onVerificationRequest = (request: VerificationRequest) => {
			console.log('Verification Request', request);
			store.update((rest) => ({ ...rest, request, phase: request.phase }));
		};

		$client.on(CryptoEvent.VerificationRequest, onVerificationRequest);

		return () => {
			$client.off(CryptoEvent.VerificationRequest, onVerificationRequest);
		};
	});

	store.subscribe((value) => {
		if (!value.request) return;

		const handleChange = () => {
			console.log('Verification Request Changed', value.request);

			console.log('Verification Phase', value.request?.phase);

			if (value.request?.cancelled && MISMATCHES.includes(value.request?.cancellationCode)) {
				console.error('Verification Request Cancelled', value.request?.cancellationCode);
			}

			store.update((rest) => ({ ...rest, phase: value.request?.phase }));
		};

		value.request.on(VerificationRequestEvent.Change, handleChange);

		return () => {
			value.request?.off(VerificationRequestEvent.Change, handleChange);
		};

		// const onVerificationCancel = (request: VerificationRequest) => {
		// 	console.log('Verification Cancel', request);
		// 	store.set({ isRequesting: false, request: undefined, accepted: false });
		// };
	});

	return {
		subscribe: store.subscribe,

		ready: () => {
			const { request } = get(store);
			if (!request) return;
			console.log('Verification Ready', request);

			store.update((rest) => ({ ...rest, isRequesting: true }));

			request.accept().then(() => {
				console.log('Verification Accepted');
				store.update((rest) => ({ ...rest, accepted: true, isRequesting: false }));
			});
		},

		reset: () => {
			get(store).request?.cancel({
				reason: 'User cancelled',
				code: 'm.user',
			});
			store.set({ isRequesting: false, request: undefined, accepted: false });
		},
	};
};

export const verificationStore = createVerificationStore();

export const rootSpaces = writable<Room[]>([]);

// export const currentVoiceRoomId = writable<string | null>(null);

export interface VoiceCallSettings {
	muted: boolean;
	deafened: boolean;
	room: string;
	call?: MatrixCall;
	firstClick: boolean;
}

export const voiceCallSettings = writable<VoiceCallSettings>({
	muted: false,
	deafened: false,
	room: '',
	call: undefined,
	firstClick: true,
});

export const jitsiConnection = createConnectionStore(DEFAULT_JITSI_CONFIG, 'matrix-client-svelte');

export const homeserverStore = persist(writable('matrix.org'), createLocalStorage(), 'homeserver');

export const exportedDeviceStore = persist(writable<IExportedDevice | undefined>(), createCookieStorage(), 'session');
