declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

export enum Status {
	OK = 'ok',
	ERROR = 'error',
};

export type Pronouns = 'he/him' | 'she/her' | "he/hen't" | 'they/he?'

export type ServerStatus = 'connecting' | 'connected' | 'failed';
export type ClientStatus = 'innactive' | 'host' | 'viewer';

export type ClientState = {
	serverStatus: ServerStatus,
	clientStatus: ClientStatus,
	connection: WebSocket | null,

	user: User | null,
	room: Room | null, // epeidh xreiazesai ena domatio gia na kaneis sex
}

export type User = {
	name: string,
	image: string,
};

export type Room = {
	pronouns?: Pronouns,
	roomID: string,
	host: User,
	viewers: User[],
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
};

export type CoreActionType = keyof CoreActionDetails;
export type CoreActionDetails = {
	'SendState': ClientState,
	'UpdatePlayer': {},
};

// TODO: Update once the server's JSONs are sent appropriately
export type ServerMessageType = keyof ServerMessageDetails;
export type ServerMessageDetails = {
	'HostRoom': Room,
	'JoinRoom': Room,
	'DisconnectRoom': {},
	'ReflectRoom': {},
};

export type ServerEvent = {
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
	getPlayerState: () => number;
	getCurrentTime: () => number;
	getDuration: () => number;
};

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
