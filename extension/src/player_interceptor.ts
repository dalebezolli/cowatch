import { onCoreAction, triggerClientMessage } from './events';
import { LogLevel, log } from './log';
import { CoreActionDetails, ReflectionSnapshot, Status, VideoDetails, YoutubePlayer, YoutubePlayerState } from './types';
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
	videoDetails: {
		title: '',
		author: '',
		authorImage: '',
		subscriberCount: '',
		likeCount: '',
	} as VideoDetails,
	latestVideo: '',
	hasLimitedInterractivity: false,
};

type PlayerInterceptorState = typeof state

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
		triggerClientMessage('ModuleStatus', { system: 'PlayerInterceptor', status: Status.ERROR });
		return;
	}

	log(LogLevel.Info, 'Initialized player interceptor successfully')();
	state.moviePlayer = moviePlayer;

	onCoreAction('SendPlayerInterceptorClientStatus', handleState);
	onCoreAction('UpdatePlayer', syncPlayer);
	onCoreAction('UpdateDetails', syncDetails);
	triggerClientMessage('ModuleStatus', { system: 'PlayerInterceptor', status: Status.OK });
}

function handleState(clientState: CoreActionDetails['SendPlayerInterceptorClientStatus']) {
	log(LogLevel.Info, 'Handle client status:', clientState, state)();
	state.latestVideo = clientState.videoId;
	if(!clientState.isShowingTruePage && !state.hasLimitedInterractivity) {
		limitInteractivity(state);
		state.hasLimitedInterractivity = !clientState.isShowingTruePage;
	} else if(clientState.isShowingTruePage && state.hasLimitedInterractivity) {
		triggerClientMessage('ShowTruePage', { videoId: clientState.videoId });
	}

	if(state.reflectionIntervalReference !== null && clientState.clientStatus === 'host' && clientState.isPrimaryTab == true) {
		return;
	}

	if(state.reflectionIntervalReference == null && clientState.clientStatus === 'host' && clientState.isPrimaryTab == true) {
		state.reflectionIntervalReference = setInterval(reflectPlayer, INITIAL_REFLECTION_SNAPSHOT_INTERVAL);
		return;
	}

	if(state.reflectionIntervalReference !== null && (clientState.clientStatus !== 'host' || clientState.isPrimaryTab == false)) {
		clearInterval(state.reflectionIntervalReference);
		state.reflectionIntervalReference = null;
		return;
	}
}

function reflectPlayer() {
	const currentReflectionSnapshot = calculateReflectionSnapshot(state.moviePlayer);
	state.reflectionSnapshot = currentReflectionSnapshot;

	const currentVideoDetails = collectCurrentVideoDetails(state.moviePlayer);
	if(
		currentVideoDetails.title != '' &&
		currentVideoDetails.author != '' && currentVideoDetails.authorImage != '' &&
		currentVideoDetails.likeCount != '' && currentVideoDetails.subscriberCount != '' && (
			currentVideoDetails.title != state.videoDetails.title ||
			currentVideoDetails.author != state.videoDetails.author ||
			currentVideoDetails.authorImage != state.videoDetails.authorImage
		)
	) {
		state.videoDetails = currentVideoDetails;
		triggerClientMessage('SendVideoDetails', state.videoDetails);
	}

	if(document.querySelector('.ad-showing') != null) {
		state.reflectionSnapshot.state = YoutubePlayerState.Paused;
	}

	triggerClientMessage('SendReflection', state.reflectionSnapshot);
}

function syncPlayer(reflection: ReflectionSnapshot) {
	const currentReflectionSnapshot = calculateReflectionSnapshot(state.moviePlayer);
	state.reflectionSnapshot = currentReflectionSnapshot;

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

let syncIntervalID = 0;
const DETAIL_SYNC_TIME_MS = 2000;
function syncDetails(videoDetails: CoreActionDetails['UpdateDetails']) {
	clearInterval(syncIntervalID);
	syncIntervalID = window.setInterval(() => {
		const domWebsiteTitle = document.querySelector<HTMLTitleElement>('head title');
		const domVideoTitle   = document.querySelector<HTMLParagraphElement>('#above-the-fold #title yt-formatted-string');
		const domAuthorName   = document.querySelector<HTMLLinkElement>('#above-the-fold #channel-name a');
		const domAuthorImage  = document.querySelector<HTMLImageElement>('yt-img-shadow.ytd-video-owner-renderer  > img');
		const domSubCounter   = document.querySelector<HTMLElement>('#owner-sub-count');
		const domLikeCounter  = document.querySelector<HTMLElement>('button[title="I like this"] div:nth-of-type(2)');
		log(LogLevel.Warn, 'Details:', domVideoTitle, videoDetails)();

		if(
			domWebsiteTitle == null || domVideoTitle == null || domAuthorName == null || 
			domAuthorImage == null || domSubCounter == null || domLikeCounter == null
		) return;
		
		domWebsiteTitle.textContent = videoDetails.title + ' - YouTube';
		domVideoTitle.style.display = 'initial'; // Sometimes YouTube forgets it has to display it, potentially I'm triggering a bug with some behavior of the extension
		domVideoTitle.textContent = videoDetails.title;
		domAuthorName.textContent = videoDetails.author;
		domAuthorImage.src = videoDetails.authorImage;
		domSubCounter.textContent = videoDetails.subscriberCount;
		domLikeCounter.textContent = videoDetails.likeCount;
	}, DETAIL_SYNC_TIME_MS);
}

function limitInteractivity(state: PlayerInterceptorState) {
	function handleRefresh(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();

		let shouldRefresh = true;
		shouldRefresh = confirm('Are you sure you want to refresh?')

		if(!shouldRefresh) return;
		triggerClientMessage('ShowTruePage', { videoId: state.latestVideo });
	}

	const refreshList = [
		document.querySelector<HTMLElement>('like-button-view-model button'),
		document.querySelector<HTMLElement>('dislike-button-view-model button'),
		document.querySelector<HTMLElement>('#above-the-fold button[title="Share"]'),
		document.querySelector<HTMLElement>('#above-the-fold button[title="Save"]'),
		document.querySelector<HTMLElement>('#above-the-fold button[title="Clip"]'),
		document.querySelector<HTMLElement>('#above-the-fold button[title="Show support with Super Thanks"]'),
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
			domElement?.addEventListener('click', handleRefresh, true);
		} else {
			const domList = domElementOrList as NodeListOf<HTMLElement>;
			for(const domElement of domList) {
				domElement?.addEventListener('click', handleRefresh, true);
			}
		}
	}
}

function calculateReflectionSnapshot(player: YoutubePlayer): ReflectionSnapshot {
	return {
		id: player.getVideoData().video_id ?? '',
		state: player.getPlayerState(),
		time: player.getCurrentTime(),
	}
}

function collectCurrentVideoDetails(player: YoutubePlayer): VideoDetails {
	let videoDetails: VideoDetails = {
		title: '',
		author: '',
		authorImage: '',
		subscriberCount: '',
		likeCount: '',
	};

	const domAuthorImage = document.querySelector<HTMLImageElement>('yt-img-shadow.ytd-video-owner-renderer  > img');
	const domSubCounter  = document.querySelector<HTMLElement>('#owner-sub-count');
	const domLikeCounter =
		document.querySelector('.ytd-video-description-header-renderer .YtwFactoidRendererFactoid .yt-core-attributed-string') ?? 
		document.querySelector('.YtLikeButtonViewModelHost .yt-spec-button-shape-next__button-text-content');

	if(domAuthorImage == null || domSubCounter == null || domLikeCounter == null) return videoDetails;

	const { title, author } = player.getVideoData();
	videoDetails.title = title;
	videoDetails.author = author;
	videoDetails.authorImage = domAuthorImage.src;
	videoDetails.subscriberCount = domSubCounter.textContent;
	videoDetails.likeCount = domLikeCounter.textContent;

	return videoDetails;
}
