import type { WidgetApiAction } from 'matrix-widget-api';
import { any } from 'underscore';
import type { Room } from 'matrix-js-sdk';
import { KJUR } from 'jsrsasign';
import { base32 } from 'rfc4648';
import { Buffer } from 'buffer';

const JITSI_DOMAIN = 'meet.element.io';

declare let JitsiMeetExternalAPI: any;
// let token: IOpenIDCredentials;

enum ElementWidgetActions {
	// All of these actions are currently specific to Jitsi and Element Call
	JoinCall = 'io.element.join',
	HangupCall = 'im.vector.hangup',
	CallParticipants = 'io.element.participants',
	MuteAudio = 'io.element.mute_audio',
	UnmuteAudio = 'io.element.unmute_audio',
	MuteVideo = 'io.element.mute_video',
	UnmuteVideo = 'io.element.unmute_video',
	StartLiveStream = 'im.vector.start_live_stream',

	// Element Call -> host requesting to start a screenshare
	// (ie. expects a ScreenshareStart once the user has picked a source)
	// replies with { pending } where pending is true if the host has asked
	// the user to choose a window and false if not (ie. if the host isn't
	// running within Electron)
	ScreenshareRequest = 'io.element.screenshare_request',
	// host -> Element Call telling EC to start screen sharing with
	// the given source
	ScreenshareStart = 'io.element.screenshare_start',
	// host -> Element Call telling EC to stop screen sharing, or that
	// the user cancelled when selecting a source after a ScreenshareRequest
	ScreenshareStop = 'io.element.screenshare_stop',

	// Actions for switching layouts
	TileLayout = 'io.element.tile_layout',
	SpotlightLayout = 'io.element.spotlight_layout',

	OpenIntegrationManager = 'integration_manager_open',

	/**
	 * @deprecated Use MSC2931 instead
	 */
	ViewRoom = 'io.element.view_room',
}

let meetApi: any;

export const join = async (
	room: Room,
	parentNode: HTMLElement,
	accessToken: string,
	serverName: string,
	displayName: string,
	userId: string,
	avatarUrl?: string,
	audioInput?: string | null,
	videoInput?: string | null
) => {
	const jwt = createJwtToken(room.roomId, accessToken, serverName, displayName, avatarUrl);

	// Create conference ID from room ID
	// For compatibility with Jitsi, use base32 without padding.
	// More details here:
	// https://github.com/matrix-org/prosody-mod-auth-matrix-user-verification
	const conferenceId = base32.stringify(Buffer.from(room.roomId), { pad: false });

	const options = {
		width: '100%',
		height: '100%',
		parentNode,
		devices: {
			audioInput,
			videoInput,
		},
		userInfo: {
			displayName,
			email: userId,
		},
		interfaceConfigOverwrite: {
			SHOW_JITSI_WATERMARK: false,
			SHOW_WATERMARK_FOR_GUESTS: false,
			MAIN_TOOLBAR_BUTTONS: [],
			VIDEO_LAYOUT_FIT: 'height',
		},
		configOverwrite: {
			subject: room.name,
			startWithAudioMuted: audioInput === null,
			startWithVideoMuted: videoInput === null,
			apiLogLevels: ['warn', 'error'],
			prejoinConfig: {
				enabled: false,
			},
			toolbarButtons: ['microphone', 'camera', 'titleview', 'hangup', 'desktop'],
			conferenceInfo: {
				autoHide: [],
			},
			disableSelfViewSettings: true,
			enableWelcomePage: false,
		},
		jwt,
		roomName: conferenceId,
	};

	meetApi = new JitsiMeetExternalAPI('meet.element.io', options);

	meetApi.addEventListener('log', (...args: any[]) => console.log('Jitsi log', ...args));
	meetApi.addEventListener('readyToClose', disconnect);
};

export const disconnect = async () => {
	if (!meetApi) return;
	meetApi.dispose();
	meetApi = null;
};

const createJwtToken = (roomId: string, accessToken: string, serverName: string, displayName: string, avatarUrl?: string) => {
	const header = { alg: 'HS256', typ: 'JWT' };
	const payload = {
		iss: JITSI_DOMAIN,
		sub: JITSI_DOMAIN,
		aud: `https://${JITSI_DOMAIN}`,
		room: '*',
		context: {
			matrix: {
				room_id: roomId,
				// token: token.access_token,
				// server_name: token.matrix_server_name,
				token: accessToken,
				server_name: serverName,
			},
			user: {
				avatar: avatarUrl,
				displayName: displayName,
			},
		},
	};

	return KJUR.jws.JWS.sign('HS256', JSON.stringify(header), JSON.stringify(payload), 'notused');
};
