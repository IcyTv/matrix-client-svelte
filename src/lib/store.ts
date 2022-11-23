import { readable, writable } from 'svelte/store';
import { invoke } from '@tauri-apps/api';
import * as sdk from 'matrix-js-sdk';

import { asyncReadable } from 'svelte-async-readable';
import type { Room } from 'matrix-js-sdk';
import { CryptoEvent } from 'matrix-js-sdk/lib/crypto';
import type { MatrixCall } from 'matrix-js-sdk/lib/webrtc/call';

export const isLoggedIn = readable<null | boolean>(null, (set) => {
	console.log('isLoggedIn: starting');
	// invoke('is_logged_in').then((result) => {
	// 	set(result as boolean);
	// });

	return () => {};
});

export const client = asyncReadable(writable<sdk.MatrixClient>(null as any), {
	dataProvider: async () => {
		let store = new sdk.IndexedDBStore({
			indexedDB: window.indexedDB,
			dbName: 'sesion',
			localStorage: window.localStorage,
		});
		await store.startup();

		let storedOpts = JSON.parse(localStorage.getItem('session') ?? '{}');

		let client = sdk.createClient({
			baseUrl: 'https://matrix.org',
			timelineSupport: true,
			store: store,
			cryptoStore: new sdk.IndexedDBCryptoStore(window.indexedDB, 'matrix-js-sdk:crypto'),
			accessToken: storedOpts.accessToken,
			deviceToImport: storedOpts.exportedDevice,
		});

		try {
			if (storedOpts.accessToken) {
				await client.initCrypto();
				await client.startClient();

				await new Promise((resolve) => client.once('sync' as any, resolve));
			}
		} catch (e) {
			console.error(e);
		}

		return client;
	},
});

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
