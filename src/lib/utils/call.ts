import type { MatrixCall } from 'matrix-js-sdk/lib/webrtc/call';

export const getUsersInCall = (call: MatrixCall) => {
	const feeds = call.getRemoteFeeds();
	console.log(feeds);
};
