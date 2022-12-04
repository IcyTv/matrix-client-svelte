import { derived, get, writable, type Readable } from 'svelte/store';
import { client } from '$lib/store';
import { EventType, RelationType, Room, RoomEvent, type MatrixEvent } from 'matrix-js-sdk';
import { transformMessages } from './utils';

export interface RoomState {
	name: string;
	id: string;
}

type ReactionCollection = {
	[eventId: string]: {
		[reaction: string]: {
			count: number;
			selfHasReacted: boolean;
		};
	};
};

export const createRoomStateStore = (roomId: string) => {
	const room = get(client).getRoom(roomId);
	if (!room) throw new Error(`Room ${roomId} not found`);
	const roomStore = writable<RoomState>({
		name: room.name,
		id: room.roomId,
	});

	room?.on(RoomEvent.Name, (event) => {
		roomStore.update((state) => ({ ...state, name: room.name }));
	});

	const eventTimeline = createEventTimelineStore(room);

	const contentfulMessages = derived(eventTimeline, ($eventTimeline) => {
		return transformMessages(get(client), $eventTimeline);
	});

	const reactions = derived(eventTimeline, ($eventTimeline) => {
		const reactions: ReactionCollection = {};
		for (const event of $eventTimeline) {
			const relation = event.getRelation();
			if (relation?.rel_type === RelationType.Annotation && relation.rel_type === RelationType.Annotation) {
				const key = relation.key!;
				const eventId = relation.event_id!;
				if (!reactions[eventId]) reactions[eventId] = {};
				if (!reactions[eventId][key]) reactions[eventId][key] = { count: 0, selfHasReacted: false };
				reactions[eventId][key].count += 1;
				if (event.sender?.userId === get(client).getUserId()!) {
					reactions[eventId][key].selfHasReacted = true;
				}
			}
		}
		return reactions;
	});

	return {
		subscribe: roomStore.subscribe,
		timeline: eventTimeline,
		messages: contentfulMessages,
		reactions,

		paginate: eventTimeline.paginate,
	};
};

interface EventTimelineStore extends Readable<MatrixEvent[]> {
	paginate: () => Promise<boolean>;
}

export const createEventTimelineStore = (room: Room): EventTimelineStore => {
	return {
		subscribe: (subscriber) => {
			const events = room.getLiveTimeline().getEvents();
			subscriber(events);

			const onTimeline = (event: MatrixEvent) => {
				// TODO can we assume these are sorted?
				subscriber(room.getLiveTimeline().getEvents());
			};

			return () => {
				room.off(RoomEvent.Timeline, onTimeline);
			};
		},

		paginate: async () => {
			const c = get(client);
			const hasMore = await c.paginateEventTimeline(room.getLiveTimeline(), { backwards: true });
			return hasMore;
		},
	};
};

const createRoomsCacheStore = () => {
	const rooms = writable<{ [roomId: string]: ReturnType<typeof createRoomStateStore> }>({});

	const getRoom = (roomId: string) => {
		rooms.update((state) => {
			if (state[roomId]) return state;
			state[roomId] = createRoomStateStore(roomId);
			return state;
		});

		return get(rooms)[roomId];
	};

	return {
		subscribe: rooms.subscribe,
		get: getRoom,
	};
};

export const roomsCache = createRoomsCacheStore();
