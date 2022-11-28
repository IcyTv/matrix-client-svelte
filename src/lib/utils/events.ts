import type { JitsiMeetJSType } from '@solyd/lib-jitsi-meet';

/**
 * Restrict valid function names to 'addEventListener' and 'removeEventListener'
 *
 * @param direction - 'add' | 'remove'
 */
function eventListenerDirection(direction: 'add' | 'remove') {
	switch (direction) {
		case 'add':
			return 'addEventListener';
		case 'remove':
			return 'removeEventListener';
		default:
			throw new Error(`eventListener direction must be 'add' or 'remove', but was '${direction}'`);
	}
}

function trackDirection(direction: 'add' | 'remove') {
	switch (direction) {
		case 'add':
			return 'addTrack';
		case 'remove':
			return 'removeTrack';
		default:
			throw new Error(`addRemoveTrack direction must be 'add' or 'remove', but was '${direction}'`);
	}
}

type ValueOf<T> = T[keyof T];

/// an object containing event types as keys and values as object containing event names as keys and event functions as values
export type JitsiEvents = { [key in keyof JitsiMeetJSType['events']]?: { [key2 in keyof JitsiMeetJSType['events'][key]]?: Function } };

/**
 * Add or remove a batch of JitsiMeetJS events on a given listening object
 *
 * @param direction - 'add' | 'remove' event listeners
 * @param listening - object that can listen for events, i.e. must have 'addEventListener', 'removeEventListener'
 * @param events - an object containing event types as keys and values as object containing event names as keys and event functions as values
 */
function wireEventListeners(
	direction: 'add' | 'remove',
	listening: { addEventListener?: (ty: any, e: any) => void; removeEventListener: (ty: any, e: any) => void },
	events: JitsiEvents
) {
	let fnName = eventListenerDirection(direction);

	for (const eventType of Object.keys(events)) {
		//TODO fix typings here...
		for (const [eventName, callback] of Object.entries((events as any)[eventType])) {
			// @ts-ignore
			listening[fnName](JitsiMeetJS.events[eventType][eventName], callback);
		}
	}
}

export { eventListenerDirection, trackDirection, wireEventListeners };
