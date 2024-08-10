declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

export enum Status {
	OK = 'ok',
	ERROR = 'error',
};

export type ServerStatus = 'connecting' | 'connected' | 'failed';
export type ClientStatus = 'innactive' | 'host' | 'viewer';

export type ClientState = {
	serverStatus: ServerStatus,
	clientStatus: ClientStatus,
	connection: WebSocket | null,

	pingTimestamp: Timestamp,
	rtt: number,
	droppedPingRequestCount: number,
	pingTimeoutId: number,

	client: AuthorizedClient | null,
	videoId: string,
	room: Room | null,
	isShowingTruePage: boolean,
}

export type Timestamp = number;

export type Client = {
	name: string,
	image: string,
	publicToken: string,
};

export type AuthorizedClient = Client & {
	privateToken: string,
};

export type Room = {
	roomID: string,
	host: Client,
	viewers: Client[],
};

export type ResolutionStrategy = 'returnToInitial' | 'stayOnCurrentView';

export type ConnectionError = {
	error: string,
	actionType: ServerMessageType,
	resolutionStrategy: ResolutionStrategy,
};

export type ClientMessageType = keyof ClientMessageDetails;
export type ClientMessageDetails = {
	'Authorize': {},
	'CollectClient': {
		status: Status,
		client: Client,
		errorMessage?: string,
	},
	'ShowTruePage': {
		videoId: string,
	},
	'GetState': {},
	'HostRoom': {},
	'JoinRoom': {
		roomID: string,
	},
	'DisconnectRoom': {},
	'SendReflection': ReflectionSnapshot,
	'SendVideoDetails': VideoDetails,
	'Ping': {
		timestamp: Timestamp,
	},
};

export type CoreActionType = keyof CoreActionDetails;
export type CoreActionDetails = {
	'SendState': ClientState,
	'SendError': ConnectionError,
	'UpdatePlayer': {},
	'LimitInteractivity': {
		videoId: string,
	},
	'UpdateDetails': VideoDetails,
};

export type ServerMessageType = keyof ServerMessageDetails;
export type ServerMessageDetails = {
	'Authorize': AuthorizedClient,
	'HostRoom': Room,
	'JoinRoom': {
		room: Room,
		clientType: number,
	},
	'UpdateRoom': Room,
	'DisconnectRoom': {},
	'ReflectRoom': ReflectionSnapshot,
	'ReflectVideoDetails': VideoDetails,
	'Pong': {
		timestamp: Timestamp,
	},
};

export type ServerMessage = {
	actionType: ServerMessageType,
	action: string,
	status: Status,
	errorMessage: string,
};

export type ReflectionSnapshot = {
	id: string,
	state: number,
	time: number,
};

export type VideoDetails = {
	title: string,
	author: string,
	authorImage: string,
	subscriberCount: string,
	likeCount: string,
};

export interface YoutubePlayer extends HTMLElement {
	getVideoData: () => { video_id: string, title: string, author: string };
	getPlayerState: () => YoutubePlayerState;
	getCurrentTime: () => number;
	getDuration: () => number;
	playVideo: () => void;
	pauseVideo: () => void;
	seekTo: (seconds: number) => void;
	loadVideoById: (videoId: string) => void;
};

export enum YoutubePlayerState {
    Unstarted = -1,
    Ended = 0,
    Playing = 1,
    Paused = 2,
    Buffering = 3,
    VideoCued = 5,
}

export enum CowatchStatus {
	Initial,
	HostOptions,
	Join,
	Loading,
	Connected,
	Options
};

export type CowatchHeaderProps = {
	onPressClose: () => void,
}

export type CowatchErrorProps = {
	error?: string,
	onClose: () => void,
};

export type CowatchContentProps = {
	room: Room,
	client: Client,
	status: CowatchStatus,
	onChangeStatus: (status: CowatchStatus) => void,
};

export type CowatchContentInitialProps = {
	client: Client,
	onHost: () => void,
	onJoin: () => void,
};

export type CowatchContentJoinOptionsProps = {
	client: Client,
	onJoin: (roomID: string) => void,
	onBack: () => void,
};

export type CowatchContentConnectedProps = {
	client: Client,
	room: Room,
	onDisconnect: () => void,
	onSettings: () => void,
};

export enum SVGIcon {
	CheckMark,
	XMark,
	Group,
	Eye,
	ArrowLeft,
	PhoneDisconnect,
	Cog,
	Broadcast,
	Mute,
	Kebab,
	Error,
};

export type IconProps = {
	icon: SVGIcon,
	size: number
};
