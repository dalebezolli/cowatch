import { onCoreAction, triggerClientMessage } from './events';
import { LogLevel, log } from './log';
import { CoreActionDetails, ReflectionSnapshot, YoutubePlayer, YoutubePlayerState } from './types';
import { sleep } from './utils';

const FAILED_INITIALIZATION_TOTAL_ATTEMPTS = parseInt(process.env.TOTAL_ATTEMPTS);
const FAILED_INITIALIZATION_REATEMPT_MS = parseInt(process.env.REATTEMPT_TIME);

const INITIAL_REFLECTION_SNAPSHOT_INTERVAL = parseInt(process.env.DEFAULT_SNAPSHOT_INTERVAL);
const REFLECTION_RESYNC_OFFSET = parseInt(process.env.DEFAULT_REFLECTION_RESYNC_OFFSET);
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
	onCoreAction('UpdatePlayer', syncPlayer);
}

function handleState(action: CoreActionDetails['SendState']) {
	if(state.refelctionIntervalReference !== null && action.clientStatus === 'host') {
		return;
	}

	if(state.refelctionIntervalReference == null && action.clientStatus === 'host') {
		state.refelctionIntervalReference = setInterval(() => {
			collectReflection();
			triggerClientMessage('SendReflection', state.reflectionSnapshot);
		}, INITIAL_REFLECTION_SNAPSHOT_INTERVAL);
	}
	
	if(state.refelctionIntervalReference !== null && action.clientStatus !== 'host') {
		clearInterval(state.refelctionIntervalReference);
		return;
	}
}

function syncPlayer(reflection: ReflectionSnapshot) {
	collectReflection();

	if(reflection.id !== state.reflectionSnapshot.id) {
		// TODO: Limit the rate at which this is running as a video cannot load fast enough.
		state.moviePlayer.loadVideoById(reflection.id);
	}
	
	if(reflection.state !== state.reflectionSnapshot.state) {
		switch(reflection.state) {
			case YoutubePlayerState.Buffering:
			case YoutubePlayerState.Playing:
				state.moviePlayer.playVideo();
				break;
			case YoutubePlayerState.Unstarted:
			case YoutubePlayerState.Paused:
				state.moviePlayer.pauseVideo();
				break;
		}
	}
	
	if(Math.abs(reflection.currentTime - state.reflectionSnapshot.currentTime) > REFLECTION_RESYNC_OFFSET) {
		state.moviePlayer.seekTo(reflection.currentTime);
	}

	log(LogLevel.Warn, "Syncing player", reflection)();
}

function collectReflection() {
	const reflection_frame = calculateReflectionSnapshot(state.moviePlayer);
	setReflectionSnapshot(reflection_frame);
	log(LogLevel.Debug, reflection_frame)();
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
