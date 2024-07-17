import { LogLevel, log } from './log';

// TODO: Initialize with user snapshot interval
const INITIAL_REFLECTION_SNAPSHOT_INTERVAL = 200;
const ID_MOVIE_PLAYER = 'movie_player';

const state = {
	movie_player: document.getElementById(ID_MOVIE_PLAYER) as YoutubePlayer | null,
	reflection_snapshot: {
		id: '',
		title: '',
		author: '',
		state: -1,
		current_time: 0,
		duration: 0,
	} as ReflectionSnapshot,
};

log(LogLevel.Debug, 'Created interceptor')();

// TODO: Move to onConnectedMessage
setInterval(() => {
	if(!state.movie_player) {
		state.movie_player = document.getElementById(ID_MOVIE_PLAYER) as YoutubePlayer | null;
		return;
	}

	const reflection_frame = calculateReflectionSnapshot(state.movie_player);
	setReflectionSnapshot(reflection_frame);
	// TODO: Send to client manager

	log(LogLevel.Debug, reflection_frame)();
}, INITIAL_REFLECTION_SNAPSHOT_INTERVAL);

function calculateReflectionSnapshot(player: YoutubePlayer): ReflectionSnapshot {
	const { video_id, title, author } = player.getVideoData();
	return {
		id: video_id || '',
		title: title,
		author: author,
		state: player.getPlayerState(),
		current_time: player.getCurrentTime(),
		duration: player.getDuration(),
	}
}

function setReflectionSnapshot(new_reflection: ReflectionSnapshot) {
	state.reflection_snapshot = new_reflection;
}

/* DEFINITIONS */
interface YoutubePlayer extends HTMLElement {
	getVideoData: () => { video_id: string, title: string, author: string };
	getPlayerState: () => number;
	getCurrentTime: () => number;
	getDuration: () => number;
};

interface ReflectionSnapshot {
	id: string,
	title: string,
	author: string,
	state: number,
	current_time: number,
	duration: number,
};
