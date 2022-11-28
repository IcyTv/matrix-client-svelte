import { writable, derived, type Writable, type Readable } from 'svelte/store';

const { DEVICE_LIST_CHANGED } = JitsiMeetJS.events.mediaDevices;
const { mediaDevices } = JitsiMeetJS;

function getDeviceList() {
	return new Promise<MediaDeviceInfo[]>(async (resolve, reject) => {
		if (await mediaDevices.isDeviceListAvailable()) {
			mediaDevices.enumerateDevices(resolve);
		} else {
			reject(new Error('Device list not available'));
		}
	});
}

function createDeviceListStore() {
	const { subscribe, set } = writable<MediaDeviceInfo[]>([]);

	const setDeviceList = (deviceList_: any[]) => {
		const deviceList = deviceList_.slice();

		// In some browsers such as Firefox, the audiooutput is not listed
		// when there is just one default device, so create a pseudo-device
		const atLeastOneAudioOutputDevice = deviceList.some((device) => device.kind === 'audiooutput');

		if (!atLeastOneAudioOutputDevice) {
			deviceList.push({
				deviceId: 'default',
				kind: 'audiooutput',
				label: 'Default',
			});
		}

		set(deviceList);
	};

	getDeviceList().then(setDeviceList);

	mediaDevices.addEventListener(DEVICE_LIST_CHANGED, setDeviceList);

	return {
		subscribe,

		set: setDeviceList,

		requery: async () => {
			const deviceList = await getDeviceList();
			setDeviceList(deviceList);
			return deviceList;
		},
	};
}

export const deviceList = createDeviceListStore();

function getDefaultDeviceId(deviceList: MediaDeviceInfo[], kind: MediaDeviceInfo['kind']): string | null {
	const deviceListOfKind = deviceList.filter((device) => device.kind === kind);
	const defaultDevice = deviceListOfKind.find((device) => device.deviceId === 'default');

	let matching;
	if (defaultDevice) {
		matching = deviceListOfKind.find((d) => d.deviceId !== 'default' && d.groupId === defaultDevice.groupId);
	}

	if (matching) {
		return matching.deviceId;
	} else if (deviceListOfKind.length > 0) {
		return deviceListOfKind[0].deviceId;
	} else {
		return null;
	}
}
export interface SelectedDevices {
	videoInput?: string | null;
	audioInput?: string | null;
	audioOutput?: string | null;
}

export const defaultDevices = derived<typeof deviceList, SelectedDevices>(deviceList, ($deviceList) => ({
	videoInput: getDefaultDeviceId($deviceList, 'videoinput'),
	audioInput: getDefaultDeviceId($deviceList, 'audioinput'),
	audioOutput: getDefaultDeviceId($deviceList, 'audiooutput'),
}));

export const selectedDevices = writable<SelectedDevices | null>(null);
