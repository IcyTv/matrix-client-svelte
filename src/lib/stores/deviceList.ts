import { client } from '$lib/store';
import type { MatrixClient, IMyDevice } from 'matrix-js-sdk';
import { CryptoEvent } from 'matrix-js-sdk/lib/crypto';
import { derived, type Readable } from 'svelte/store';

export const deviceListStore = derived<Readable<MatrixClient>, IMyDevice[]>(client, ($client, set) => {
	$client?.getDevices().then((devices) => {
		set(devices.devices);
	});

	const onDeviceChanged = async () => {
		set((await $client.getDevices()).devices);
	};

	$client?.on(CryptoEvent.DevicesUpdated, onDeviceChanged);

	return () => {
		$client?.off(CryptoEvent.DevicesUpdated, onDeviceChanged);
	};
});

export const myDeviceStore = derived<Readable<MatrixClient>, IMyDevice>(client, ($client, set) => {
	$client?.getDevice($client?.getDeviceId()!).then((device) => {
		set(device);
	});

	const onDeviceChanged = async () => {
		set(await $client.getDevice($client.getDeviceId()));
	};

	$client?.on(CryptoEvent.DeviceVerificationChanged, onDeviceChanged);

	return () => {
		$client?.off(CryptoEvent.DeviceVerificationChanged, onDeviceChanged);
	};
});
