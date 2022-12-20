import RelativeTime from '@yaireo/relative-time';

export const timeFormatter = new Intl.DateTimeFormat(undefined, {
	year: undefined,
	month: undefined,
	day: undefined,
	hour: 'numeric',
	minute: 'numeric',
});
export const fullTimeFormatter = new Intl.DateTimeFormat(undefined, {
	year: 'numeric',
	month: 'long',
	day: 'numeric',
	hour: 'numeric',
	minute: 'numeric',
});
export const relativeTime = new RelativeTime();
