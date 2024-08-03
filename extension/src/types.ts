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

	user: User | null,
	room: Room | null,
}

export type Timestamp = number;

export type User = {
	name: string,
	image: string,
};

export type Room = {
	roomID: string,
	host: User,
	viewers: User[],
}

export type ResolutionStrategy = 'returnToInitial' | 'stayOnCurrentView';

export type ConnectionError = {
	error: string,
	actionType: ServerMessageType,
	resolutionStrategy: ResolutionStrategy,
}

export interface UserEvent extends CustomEvent {
	actionType: UserActionType,
	action: any,
}

export type UserActionType = keyof UserActionDetails;
export type UserActionDetails = {
	'CollectUser': {
		status: Status,
		user: User,
		errorMessage?: string,
	},
	'GetState': {},
	'HostRoom': {},
	'JoinRoom': {
		roomID: string,
	},
	'DisconnectRoom': {},
	'SendReflection': ReflectionSnapshot,
	'Ping': {
		timestamp: Timestamp,
	},
};

export type CoreActionType = keyof CoreActionDetails;
export type CoreActionDetails = {
	'SendState': ClientState,
	'SendError': ConnectionError,
	'UpdatePlayer': {},
};

export type ServerMessageType = keyof ServerMessageDetails;
export type ServerMessageDetails = {
	'HostRoom': Room,
	'JoinRoom': Room,
	'UpdateRoom': Room,
	'DisconnectRoom': {},
	'ReflectRoom': ReflectionSnapshot,
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
	title: string,
	author: string,
	state: number,
	currentTime: number,
	duration: number,
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
	user: User,
	status: CowatchStatus,
	onChangeStatus: (status: CowatchStatus) => void,
};

export type CowatchContentInitialProps = {
	user: User,
	onHost: () => void,
	onJoin: () => void,
};

export type CowatchContentJoinOptionsProps = {
	user: User,
	onJoin: (roomID: string) => void,
	onBack: () => void,
};

export type CowatchContentConnectedProps = {
	user: User,
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
