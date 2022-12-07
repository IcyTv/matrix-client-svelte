import { derived, get, writable, type Readable } from 'svelte/store';
import { client } from '$lib/store';
import {
	ClientEvent,
	Direction,
	EventTimeline,
	EventTimelineSet,
	EventType,
	MatrixError,
	MatrixEvent,
	MatrixEventEvent,
	RelationType,
	Room,
	RoomEvent,
	RoomMemberEvent,
	TimelineWindow,
	type IRoomTimelineData,
} from 'matrix-js-sdk';
import { transformMessages } from './utils';
import { Thread, ThreadEvent } from 'matrix-js-sdk/lib/models/thread';
import _ from 'underscore';
import type ScrollPanel from '../components/ScrollPanel.svelte';

export const memberListIsOpen = writable(true);

export enum TimelineRenderingType {
	Room = 'Room',
	Thread = 'Thread',
	ThreadsList = 'ThreadsList',
	File = 'File',
	Notification = 'Notification',
	Search = 'Search',
	Pinned = 'Pinned',
}

// By default, disable the timelineCap in favour of unpaginating based on
// event tile heights. (See _unpaginateEvents)
const DEFAULT_TIMELINE_CAP = Number.MAX_VALUE;
const INITIAL_LOAD_SIZE = 20;
const PAGINATE_SIZE = 20;

export const createTimelineStore = (timelineSet: EventTimelineSet) => {
	const state = writable({
		timelineRenderingType: TimelineRenderingType.Room,
		threadId: '',
	});
	let timelineWindow: TimelineWindow;
	const events = writable<MatrixEvent[]>([]);
	const liveEvents = writable<MatrixEvent[]>([]);
	const timelineLoading = writable(true);
	const firstVisibleEventIndex = writable(0);
	const paginationState = writable({
		canBackPaginate: false,
		canForwardPaginate: false,
		isForwardPaginating: false,
		isBackPaginating: false,
	});
	const scrollPanel = writable<ScrollPanel | null>(null);

	const checkForPrejoinUISI = (events: MatrixEvent[]) => {
		const cli = get(client);
		const room = timelineSet.room;

		const isThreadTimeline = [TimelineRenderingType.Thread, TimelineRenderingType.ThreadsList].includes(get(state).timelineRenderingType);

		if (events.length === 0 || !room || !cli.isRoomEncrypted(room.roomId) || isThreadTimeline) return 0;

		const userId = cli.getUserId();
		// get the user's membership at the last event by getting the timeline
		// that the event belongs to, and traversing the timeline looking for
		// that event, while keeping track of the user's membership
		let i = events.length - 1;
		let userMembership = 'leave';
		for (; i >= 0; i--) {
			const timeline = room.getTimelineForEvent(events[i].getId());
			if (!timeline) continue;

			userMembership = timeline.getState(Direction.Forward).getMember(userId!)?.membership ?? 'leave';
			const timelineEvents = timeline.getEvents();

			for (let j = timelineEvents.length - 1; j >= 0; j--) {
				const event = timelineEvents[j];
				if (event.getId() === events[i].getId()) {
					break;
				} else if (event.getStateKey() === userId && event.getType() === EventType.RoomMember) {
					userMembership = event.getPrevContent().membership ?? 'leave';
				}
			}
			break;
		}

		// now go through the rest of the events and find the first undecryptable
		// one that was sent when the user wasn't in the room

		for (; i >= 0; i--) {
			const event = events[i];
			if (event.getStateKey() === userId && event.getType() === EventType.RoomMember) {
				userMembership = event.getPrevContent().membership || 'leave';
			} else if (userMembership === 'leave' && (event.isDecryptionFailure() || event.isBeingDecrypted())) {
				// reached an undecryptable message when the user wasn't in the room -- don't try to load any more
				// Note: for now, we assume that events that are being decrypted are
				// not decryptable - we will be called once more when it is decrypted.
				return i + 1;
			}
		}

		return 0;
	};

	const getEvents = () => {
		const events = timelineWindow.getEvents();
		const cl = get(client);

		//performs a shallow copy of the array
		// we want the last event to be decrypted first but displayed last
		// `reverse` is destructive and unfortunately mutates the "events" array
		events
			.slice(0, events.length)
			.reverse()
			.forEach((event) => {
				if (event.getType() === EventType.RoomMessageEncrypted) {
					cl.decryptEventIfNeeded(event);
				}
			});

		const firstVisibleEventIndex = checkForPrejoinUISI(events);

		// Hold onto the live events separately. The read receipt and read marker
		// should use this list, so that they don't advance into pending events.
		const liveEvents = [...events];

		if (!timelineWindow.canPaginate(Direction.Forward)) {
			const pendingEvents = timelineSet.getPendingEvents();
			const tId = get(state).threadId;
			events.push(
				...pendingEvents.filter((event) => {
					const { shouldLiveInRoom, threadId } = timelineSet.room!.eventShouldLiveIn(event);

					if (get(state).timelineRenderingType === TimelineRenderingType.Thread) {
						return threadId === tId;
					} else {
						return shouldLiveInRoom;
					}
				})
			);
		}

		return { events, liveEvents, firstVisibleEventIndex };
	};

	const onRoomTimeline = (ev: MatrixEvent, room: Room | undefined, toStartOfTimeline: boolean | undefined, removed: boolean, data: IRoomTimelineData) => {
		console.log('onRoomTimeline');
		if (data.timeline.getTimelineSet() !== timelineSet) return;

		//TODO
		if (!Thread.hasServerSideSupport && get(state).timelineRenderingType === TimelineRenderingType.Thread) {
			if (toStartOfTimeline && !get(paginationState).canBackPaginate) {
				paginationState.update((state) => {
					state.canBackPaginate = true;
					return state;
				});
			}
			if (!toStartOfTimeline && !get(paginationState).canForwardPaginate) {
				paginationState.update((state) => {
					state.canForwardPaginate = true;
					return state;
				});
			}
		}

		// ignore anything but real-time updates at the end of the room:
		// updates from pagination will happen when the paginate completes.
		if (toStartOfTimeline || !data || !data.liveEvent) return;

		//TODO update based on scroll state?
		if (!get(scrollPanel)?.getScrollState()) return;
		if (!get(scrollPanel)?.getScrollState().stuckAtBottom) {
			paginationState.update((state) => ({
				...state,
				canForwardPaginate: true,
			}));
			return;
		}

		// tell the timeline window to try to advance itself, but not to make
		// a http request to do so.
		//
		// we deliberately avoid going via the ScrollPanel for this call - the
		// ScrollPanel might already have an active pagination promise, which
		// will fail, but would stop us passing the pagination request to the
		// timeline window.
		//
		// see https://github.com/vector-im/vector-web/issues/1035
		timelineWindow.paginate(Direction.Forward, 1, false).then(() => {
			console.log('Paginated');
			const evs = getEvents();
			//TODO manage read markers?
			events.set(evs.events);
			liveEvents.set(evs.liveEvents);
			firstVisibleEventIndex.set(evs.firstVisibleEventIndex);

			get(scrollPanel)?.updateTimelineMinHeight();
		});
	};
	const onRoomTimelineReset = (room: Room | undefined, newTimelineSet: EventTimelineSet) => {
		if (timelineSet != newTimelineSet) return;

		if (get(scrollPanel)?.isAtBottom()) {
			loadTimeline();
		}

		loadTimeline();
	};
	const onRoomRedaction = (ev: MatrixEvent, room: Room) => {
		if (timelineSet.room != room) return;

		//TODO force update?
	};
	const onLocalEchoUpdated = (event: MatrixEvent, room: Room) => {
		if (timelineSet.room != room) return;
		reloadEvents();
	};
	const onAccountData = (ev: MatrixEvent, room: Room) => {
		if (timelineSet.room != room) return;
		if (ev.getType() != EventType.FullyRead) return;

		// TODO implement event markers
	};
	const onRoomReceipt = () => {
		// TODO again, force update?
	};
	const onEventDecrypted = (ev: MatrixEvent) => {
		if (!timelineSet.room) return;
		if (ev.getRoomId() != timelineSet.room.roomId) return;
		if (!get(events).includes(ev)) return;

		recheckFirstVisibleEventIndex();
		//TODO force update?
	};
	const onEventReplaced = (replacedEvent: MatrixEvent) => {
		if (replacedEvent.getRoomId() !== timelineSet.room?.roomId) return;

		// TODO again, force update here...
	};
	const onThreadUpdate = () => {};

	// TODO ?
	const onEventVisibilityChanged = () => {};
	const onVisibilityPowerLevelChanged = () => {};

	const recheckFirstVisibleEventIndex = _.throttle(
		() => {
			const fvei = checkForPrejoinUISI(get(events));
			if (fvei !== get(firstVisibleEventIndex)) {
				firstVisibleEventIndex.set(fvei);
			}
		},
		500,
		{ leading: true, trailing: true }
	);

	const jumpToLiveTimeline = () => {
		if (timelineWindow.canPaginate(Direction.Forward)) {
			loadTimeline();
		} else {
			//TODO scroll to bottom
		}
	};

	// Force refresh the timeline before threads support pending events
	const refreshTimeline = (eventId?: string) => {
		loadTimeline(eventId);
		reloadEvents();
	};

	const isAtEndOfLiveTimeline = () => {
		return timelineWindow && !timelineWindow.canPaginate(Direction.Forward);
	};

	const loadTimeline = (eventId?: string) => {
		const cli = get(client);
		if (!cli) return;
		timelineWindow = new TimelineWindow(cli, timelineSet, { windowLimit: DEFAULT_TIMELINE_CAP });
		// TODO do we need to clear the timeline min-height when (re)loading the timeline?

		const onError = (e: MatrixError) => {
			console.error(e);
			timelineLoading.set(false);
		};

		const onLoaded = () => {
			get(scrollPanel)?.clearPreventShrinking();
			reloadEvents();

			paginationState.update((s) => ({
				...s,
				canBackPaginate: timelineWindow.canPaginate(Direction.Backward),
				canForwardPaginate: timelineWindow.canPaginate(Direction.Forward),
			}));
			timelineLoading.set(false);
		};

		// if we already have the event in question, TimelineWindow.load
		// returns a resolved promise.
		//
		// In this situation, we don't really want to defer the update of the
		// state to the next event loop, because it makes room-switching feel
		// quite slow. So we detect that situation and shortcut straight to
		// calling _reloadEvents and updating the state.

		// This is a hot-path optimization by skipping a promise tick
		// by repeating a no-op sync branch in
		// TimelineSet.getTimelineForEvent & MatrixClient.getEventTimeline
		if (timelineSet.getTimelineForEvent(eventId!)) {
			timelineWindow.load(eventId, INITIAL_LOAD_SIZE);
			//TODO dispatch loaded?
			return;
		}

		const prom = timelineWindow.load(eventId, INITIAL_LOAD_SIZE);
		// TODO buildLegacyCallEventGroupers
		events.set([]);
		liveEvents.set([]);
		paginationState.set({
			canBackPaginate: false,
			canForwardPaginate: false,
			isBackPaginating: false,
			isForwardPaginating: false,
		});
		timelineLoading.set(true);
		prom.then(onLoaded, onError);
	};

	const reloadEvents = () => {
		const evts = getEvents();
		events.set(evts.events);
		liveEvents.set(evts.liveEvents);
		firstVisibleEventIndex.set(evts.firstVisibleEventIndex);
	};

	const shouldPaginate = () => {
		return !get(events).some((e) => e.isBeingDecrypted());
	};

	const paginate = async (backwards: boolean): Promise<boolean> => {
		if (!shouldPaginate()) return false;

		const dir = backwards ? Direction.Backward : Direction.Forward;
		const canPaginateKey = backwards ? 'canBackPaginate' : 'canForwardPaginate';
		const isPaginatingKey = backwards ? 'isBackPaginating' : 'isForwardPaginating';

		if (!get(paginationState)[canPaginateKey]) return false;
		if (!timelineWindow.canPaginate(dir)) {
			paginationState.update((s) => ({ ...s, [canPaginateKey]: false }));
			return false;
		}

		if (backwards && get(firstVisibleEventIndex) !== 0) return false;

		paginationState.update((s) => ({ ...s, [isPaginatingKey]: true }));

		const ret = await timelineWindow.paginate(dir, PAGINATE_SIZE);

		const { events: newEvents, liveEvents: newLiveEvents, firstVisibleEventIndex: fvei } = getEvents();
		//TODO buildLegacyCallEventGroupers
		paginationState.update((s) => ({
			...s,
			[canPaginateKey]: ret,
			[isPaginatingKey]: false,
		}));
		events.set(newEvents);
		liveEvents.set(newLiveEvents);
		firstVisibleEventIndex.set(fvei);

		// moving the window in this direction may mean that we can now
		// paginate in the other where we previously could not.
		const otherDir = backwards ? Direction.Forward : Direction.Backward;
		const canOtherPaginateKey = backwards ? 'canForwardPaginate' : 'canBackPaginate';
		if (!get(paginationState)[canOtherPaginateKey] && timelineWindow.canPaginate(otherDir)) {
			paginationState.update((s) => ({ ...s, [canOtherPaginateKey]: true }));
		}

		return ret && (!backwards || fvei === 0);
	};

	const unpaginate = (backwards: boolean, scrollToken: string) => {
		const eventId = scrollToken;
		const marker = get(events).findIndex((e) => e.getId() === eventId);
		const count = backwards ? marker + 1 : get(events).length - marker;

		if (count > 0) {
			timelineWindow.unpaginate(count, backwards);
			const { events: newEvents, liveEvents: newLiveEvents, firstVisibleEventIndex: fvei } = getEvents();
			//TODO buildLegacyCallEventGroupers
			paginationState.update((s) => {
				if (backwards) {
					s.canBackPaginate = true;
				} else {
					s.canForwardPaginate = true;
				}
				return s;
			});
			events.set(newEvents);
			liveEvents.set(newLiveEvents);
			firstVisibleEventIndex.set(fvei);
		}
	};

	const initTimeline = (props?: { eventId?: string }) => {
		return loadTimeline(props?.eventId);
	};

	client.subscribe(($client) => {
		if (!$client) return;
		$client.on(RoomEvent.Timeline, onRoomTimeline);
		$client.on(RoomEvent.TimelineReset, onRoomTimelineReset);
		$client.on(RoomEvent.Redaction, onRoomRedaction);

		//TODO
		$client.on(MatrixEventEvent.VisibilityChange, onEventVisibilityChanged);
		$client.on(RoomMemberEvent.PowerLevel, onVisibilityPowerLevelChanged);

		$client.on(RoomEvent.RedactionCancelled, onRoomRedaction);
		$client.on(RoomEvent.Receipt, onRoomReceipt);
		$client.on(RoomEvent.LocalEchoUpdated, onLocalEchoUpdated);
		$client.on(RoomEvent.AccountData, onAccountData);
		$client.on(MatrixEventEvent.Decrypted, onEventDecrypted);
		$client.on(MatrixEventEvent.Replaced, onEventReplaced);

		timelineSet.room?.on(ThreadEvent.Update, onThreadUpdate);

		console.log('TimelineStore: subscribing to room events', $client.eventNames());

		return () => {
			$client.off(RoomEvent.Timeline, onRoomTimeline);
			$client.off(RoomEvent.TimelineReset, onRoomTimelineReset);
			$client.off(RoomEvent.Redaction, onRoomRedaction);

			//TODO
			$client.off(MatrixEventEvent.VisibilityChange, onEventVisibilityChanged);
			$client.off(RoomMemberEvent.PowerLevel, onVisibilityPowerLevelChanged);

			$client.off(RoomEvent.RedactionCancelled, onRoomRedaction);
			$client.off(RoomEvent.Receipt, onRoomReceipt);
			$client.off(RoomEvent.LocalEchoUpdated, onLocalEchoUpdated);
			$client.off(RoomEvent.AccountData, onAccountData);
			$client.off(MatrixEventEvent.Decrypted, onEventDecrypted);
			$client.off(MatrixEventEvent.Replaced, onEventReplaced);

			timelineSet.room?.off(ThreadEvent.Update, onThreadUpdate);
		};
	});

	const eventsStore = derived([events, liveEvents, firstVisibleEventIndex], ([$events, $liveEvents, $firstVisibleEventIndex]) => {
		return {
			events: $events,
			liveEvents: $liveEvents,
			firstVisibleEventIndex: $firstVisibleEventIndex,
		};
	});

	const stateStore = derived([timelineLoading, paginationState, state], ([$timelineLoading, $paginationState, $state]) => {
		return {
			...$state,
			timelineLoading: $timelineLoading,
			paginationState: $paginationState,
		};
	});

	return {
		subscribe: eventsStore.subscribe,
		state: stateStore,
		scrollPanel,

		initTimeline,
		loadTimeline,
		jumpToLiveTimeline,
		isAtEndOfLiveTimeline,
		refreshTimeline,
		paginate,
		unpaginate,
	};
};

export const createTimelineCacheStore = () => {
	const cache = writable<Record<string, ReturnType<typeof createTimelineStore>>>({}); // roomId => timelineStore

	const getTimelineStore = (roomId: string) => {
		const $cache = get(cache);
		if (!$cache[roomId]) {
			const room = get(client).getRoom(roomId);
			const timelineSet = room?.getUnfilteredTimelineSet();
			if (!timelineSet) {
				throw new Error('Room not found');
			}
			$cache[roomId] = createTimelineStore(timelineSet);
			cache.set($cache);
		}
		return $cache[roomId];
	};

	return {
		subscribe: cache.subscribe,
		getTimelineStore,
	};
};

export const timelineCacheStore = createTimelineCacheStore();
