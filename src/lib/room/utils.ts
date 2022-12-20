import { EventType, MatrixClient } from 'matrix-js-sdk';
import type { MatrixEvent } from 'matrix-js-sdk';
import ColorHash from 'color-hash';
import RelativeTime from '@yaireo/relative-time';
import EMOJI_REGEX from 'emojibase-regex/emoji';

export const ONLY_EMOJI_REGEX = new RegExp(`^(${EMOJI_REGEX.source})+$`);
export const URL_REGEX =
	/(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/g;

interface MessageBody {
	image?: string;
	video?: string;
	text: string;
	mimeType: string;
}

export interface MessageEvent {
	event: MatrixEvent;
	date: Date;
	realTime: string;
	body: MessageBody;
	hasReply: boolean;
}

interface MessageEventGroup {
	humanTime: string;
	date: Date;
	events: MessageEvent[];
	sender: string;
	senderAvatar?: string;
	senderName?: string;
	senderColor?: string;
	hasToShowDate: boolean;
}

export const MAX_TIMESTAMP_DIFF = 5 * 60 * 1000; // 5 minutes
const MAX_RELATIVE_DATE = 7 * 24 * 60 * 60 * 1000; // 7 days

const timeFormatter = new Intl.DateTimeFormat(undefined, {
	year: undefined,
	month: undefined,
	day: undefined,
	hour: 'numeric',
	minute: 'numeric',
});
const dateFormatter = new Intl.DateTimeFormat(undefined, {
	year: 'numeric',
	month: 'long',
	day: 'numeric',
});
const relativeDateFormatter = new Intl.RelativeTimeFormat(undefined, {
	numeric: 'auto',
	style: 'long',
});

export const optionalMcxToHttp = (client: MatrixClient, url?: string) => {
	if (url) {
		return client.mxcUrlToHttp(url);
	} else {
		return url;
	}
};

export const colorHash = new ColorHash({ saturation: 1.0, lightness: [0.5, 0.7] });

export const transformMessages = (client: MatrixClient, events: MatrixEvent[]) =>
	events
		.sort((a, b) => a.getTs() - b.getTs())
		.filter((e) => e.getType() === EventType.RoomMessage)
		// Filter out redacted events
		.filter((e) => !e.isRedacted())
		.map((e) => {
			const eventTime = e.getTs();

			return {
				event: e,
				date: new Date(eventTime),
				realTime: timeFormatter.format(eventTime),
				body: {
					// text: e.content['m.new_content']?.formatted_body ?? e.content.formatted_body ?? e.content.body,
					text: e.getContent().body,
					// image: optionalMcxToHttp(e.content.info?.thumbnail_url ?? e.content.url),
					image: optionalMcxToHttp(client, e.getContent().info?.thumbnail_url) || optionalMcxToHttp(client, e.getContent().url),
					// video: optionalMcxToHttp(e.content.url),
					video: optionalMcxToHttp(client, e.getContent().url),
					// mimeType: e.content.info?.mimetype ?? 'text/plain',
					mimeType: e.getContent().info?.mimetype ?? 'text/plain',
				},
				hasReply: !!e.replyEventId,
			} as MessageEvent;
		})
		.reduce<MessageEventGroup[]>((acc, val) => {
			const prevSeq = acc[acc.length - 1];
			// if (!prevSeq || prevSeq.sender !== val.event.sender || val.date.getTime() - prevSeq.date.getTime() > MAX_TIMESTAMP_DIFF) {
			if (!prevSeq || prevSeq.sender !== val.event.getSender() || val.date.getTime() - prevSeq.date.getTime() > MAX_TIMESTAMP_DIFF || val.hasReply) {
				const time = new RelativeTime();
				// const sender = $client.getUser(val.event.sender);
				const sender = client.getUser(val.event.getSender());
				// const senderColor = colorHash.hex(val.event.sender);
				const senderColor = colorHash.hex(val.event.getSender());
				acc.push({
					humanTime: time.from(val.date),
					date: val.date,
					events: [val],
					// sender: val.event.sender,
					sender: val.event.getSender(),
					senderAvatar: optionalMcxToHttp(client, sender?.avatarUrl) ?? undefined,
					senderName: sender?.displayName as string | undefined,
					senderColor,
					// Has to show date if the last event was on a different day
					hasToShowDate: !prevSeq || prevSeq.date.getDate() !== val.date.getDate(),
				});
			} else {
				prevSeq.events.push(val);
			}

			return acc;
		}, []);

export const formatDate = (date: Date) => {
	if (Date.now() - date.getTime() > MAX_RELATIVE_DATE) {
		return dateFormatter.format(date);
	} else {
		return relativeDateFormatter.format(date.getUTCDate() - new Date().getUTCDate(), 'day');
	}
};
