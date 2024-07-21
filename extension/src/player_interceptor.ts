import { onCoreAction, triggerUserAction } from './events';
import { LogLevel, log } from './log';
import { CoreActionDetails, ReflectionSnapshot, YoutubePlayer } from './types';
import { sleep } from './utils';

// TODO: Initialize with user snapshot interval
const FAILED_INITIALIZATION_TOTAL_ATTEMPTS = 25;
const FAILED_INITIALIZATION_REATEMPT_MS = 1000;
const INITIAL_REFLECTION_SNAPSHOT_INTERVAL = 200;
const ID_MOVIE_PLAYER = 'movie_player';

const state = {
	refelctionIntervalReference: null as NodeJS.Timeout,
	moviePlayer: null as YoutubePlayer,
	reflectionSnapshot: {
		id: '',
		title: '',
		author: '',
		state: -1,
		currentTime: 0,
		duration: 0,
	} as ReflectionSnapshot,
};

intializePlayerInterceptor();

async function intializePlayerInterceptor() {
	let moviePlayer: YoutubePlayer | null = null;
	let failedInitCount = 0;
	let didSucceed = false;

	log(LogLevel.Info, `Attempt ${failedInitCount + 1} to initialize player interceptor...`)();
	while(failedInitCount < FAILED_INITIALIZATION_TOTAL_ATTEMPTS && didSucceed === false) {
		moviePlayer = document.getElementById(ID_MOVIE_PLAYER) as YoutubePlayer;
		didSucceed = moviePlayer != null;
		if(!didSucceed) await sleep(FAILED_INITIALIZATION_REATEMPT_MS);
	}

	if(!didSucceed) {
		log(LogLevel.Error, 'Failed to initialize player interceptor')();
	}

	log(LogLevel.Info, 'Initialized player interceptor successfully')();
	state.moviePlayer = moviePlayer;

	onCoreAction('SendState', handleState);
}

function handleState(action: CoreActionDetails['SendState']) {
	if(state.refelctionIntervalReference !== null && action.clientStatus === 'host') {
		return;
	}

	if(state.refelctionIntervalReference == null && action.clientStatus === 'host') {
		state.refelctionIntervalReference = setInterval(collectReflection, INITIAL_REFLECTION_SNAPSHOT_INTERVAL);
	}
	
	if(state.refelctionIntervalReference !== null && action.clientStatus === 'viewer') {
		clearInterval(state.refelctionIntervalReference);
		return;
	}
}

function collectReflection() {
	const reflection_frame = calculateReflectionSnapshot(state.moviePlayer);
	setReflectionSnapshot(reflection_frame);
	log(LogLevel.Debug, reflection_frame)();
	triggerUserAction('SendReflection', state.reflectionSnapshot);
}

function calculateReflectionSnapshot(player: YoutubePlayer): ReflectionSnapshot {
	const { video_id, title, author } = player.getVideoData();
	return {
		id: video_id || '',
		title: title,
		author: author,
		state: player.getPlayerState(),
		currentTime: player.getCurrentTime(),
		duration: player.getDuration(),
	}
}

function setReflectionSnapshot(new_reflection: ReflectionSnapshot) {
	state.reflectionSnapshot = new_reflection;
}
