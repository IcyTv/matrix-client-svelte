export const JOIN_ROOM_AUDIO_SRC = '/audio/maximize_008.ogg';
export const LEAVE_ROOM_AUDIO_SRC = '/audio/minimize_008.ogg';

export const playAudio = (src: string) => {
	const audio = new Audio(src);
	audio.play();
};
