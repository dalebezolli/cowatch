declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

export enum Status {
	OK = 'ok',
	ERROR = 'error',
};

export type ServerStatus = 'connecting' | 'connected' | 'failed';
export type ClientStatus = 'disconnected' | 'innactive' | 'host' | 'viewer';

export type ClientState = {
	systemStatuses: {
		[T in System]: Status;
	},
	serverStatus: ServerStatus,
	clientStatus: ClientStatus,
	connection: WebSocket | null,

	pingTimestamp: Timestamp,
	rtt: number,
	droppedPingRequestCount: number,
	pingRequestIntervalId: number,
	pingTimeoutId: number,

	client: AuthorizedClient | null,
	videoId: string,
	room: Room | null,
	isShowingTruePage: boolean,
	isPrimaryTab: boolean,
}

/**
 * Unix timestamp stored in seconds
 */
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
	settings: RoomSettings,
	createdAt: Timestamp,
};

export type RoomSettings = {
	name: string,
};

export type ResolutionStrategy = 'returnToInitial' | 'stayOnCurrentView' | 'displayOnInput' | 'showUpdate';

export type ConnectionError = {
	error: string,
	actionType: ServerMessageType,
	resolutionStrategy: ResolutionStrategy,
};

export type ConnectionStatus = {
	connection: ServerStatus,
	latestPing: number,
	averagePing: number,
};

export type System = 'RoomUI' | 'PlayerInterceptor' | 'ClientCollector' | 'Connection';
export type RoomUISystemStatus = {
		[T in System]: Status;
	} & {
		clientStatus: ClientStatus;
		serverStatus: ServerStatus;
		isPrimaryTab: boolean;
	};

export type RoomUIRoomDetails = {
	room: Room;
	status: ClientStatus;
};

export type PlayerInterceptorClientStatus = {
	clientStatus: ClientStatus;
	videoId: string;
	isShowingTruePage: boolean;
	isPrimaryTab: boolean;
};

export type ClientMessageType = keyof ClientMessageDetails;
export type ClientMessageDetails = {
	'ModuleStatus': { system: System, status: Status },
	'Authorize': {},
	'CollectClient': {
		status: Status,
		client: Client,
		errorMessage?: string,
	},
	'SwitchActiveTab': {},
	'ShowTruePage': {
		videoId: string,
	},
	'GetState': {},
	'HostRoom': RoomSettings,
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
	'SendRoomUIClient': Client,
	'SendRoomUISystemStatus': RoomUISystemStatus,
	'SendRoomUIUpdateRoom': RoomUIRoomDetails,
	'SendRoomUIPingDetails': ConnectionStatus,

	'SendPlayerInterceptorClientStatus': PlayerInterceptorClientStatus,

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
	action: any,
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

export type CowatchErrorProps = {
	error?: string,
	onClose: () => void,
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
