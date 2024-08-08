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
	reflectionIntervalReference: null as NodeJS.Timeout,
	moviePlayer: null as YoutubePlayer,
	reflectionSnapshot: {
		id: '',
		state: -1,
		time: 0,
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

function handleState(clientState: CoreActionDetails['SendState']) {
	if(!clientState.isShowingTruePage) {
		limitInteractivity(clientState.roomDetails.videoId);
	}

	if(state.reflectionIntervalReference !== null && clientState.clientStatus === 'host') {
		return;
	}

	if(state.reflectionIntervalReference == null && clientState.clientStatus === 'host') {
		state.reflectionIntervalReference = setInterval(() => {
			collectReflection();

			if(document.querySelector('.ad-showing') != null) {
				state.reflectionSnapshot.state = YoutubePlayerState.Paused;
			}

			triggerClientMessage('SendReflection', state.reflectionSnapshot);
		}, INITIAL_REFLECTION_SNAPSHOT_INTERVAL);
	}
	
	if(state.reflectionIntervalReference !== null && clientState.clientStatus !== 'host') {
		clearInterval(state.reflectionIntervalReference);
		state.reflectionIntervalReference = null;
		return;
	}
}

function syncPlayer(reflection: ReflectionSnapshot) {
	collectReflection();
	if(reflection.id !== state.reflectionSnapshot.id) {
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
	
	if(Math.abs(reflection.time - state.reflectionSnapshot.time) > REFLECTION_RESYNC_OFFSET) {
		state.moviePlayer.seekTo(reflection.time);
	}
}

function limitInteractivity(videoId: string) {
	function handleRefresh(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();

		let shouldRefresh = true;
		shouldRefresh = confirm('Are you sure you want to refresh?')

		if(!shouldRefresh) return;
		location.assign(`https://youtube.com/watch?v=${videoId}`)
	}

	const refreshList = [
		document.querySelector<HTMLElement>('like-button-view-model button'),
		document.querySelector<HTMLElement>('dislike-button-view-model button'),
		document.querySelector<HTMLElement>('#above-the-fold button[title="Share"]'),
		document.querySelector<HTMLElement>('#above-the-fold yt-button-shape button[aria-label="More actions"]'),
		document.querySelector<HTMLElement>('like-button-view-model button'),
		document.querySelector<HTMLElement>('#above-the-fold #subscribe-button button'),
		document.querySelector<HTMLElement>('#sponsor-button button'),
		document.querySelectorAll<HTMLElement>('ytd-video-owner-renderer a'),
	]

	for(const domElementOrList of refreshList) {
		if(domElementOrList == null) continue;

		if(domElementOrList['length'] == null) {
			const domElement = domElementOrList as HTMLElement;
			domElement?.removeEventListener('click', handleRefresh, { capture: true });
			domElement?.addEventListener('click', handleRefresh, { capture: true });
		} else {
			const domList = domElementOrList as NodeListOf<HTMLElement>;
			for(const domElement of domList) {
				domElement?.removeEventListener('click', handleRefresh, { capture: true });
				domElement?.addEventListener('click', handleRefresh, { capture: true });
			}
		}
	}
}

function collectReflection() {
	const reflection_frame = calculateReflectionSnapshot(state.moviePlayer);
	setReflectionSnapshot(reflection_frame);
	log(LogLevel.Debug, reflection_frame)();
}

function calculateReflectionSnapshot(player: YoutubePlayer): ReflectionSnapshot {
	return {
		id: player.getVideoData().video_id ?? '',
		state: player.getPlayerState(),
		time: player.getCurrentTime(),
	}
}

function setReflectionSnapshot(new_reflection: ReflectionSnapshot) {
	state.reflectionSnapshot = new_reflection;
}
