import { ClientStatus, ServerMessageDetails, ServerMessageType, Status } from './types';

import { getState } from './state';
import { triggerClientMessage, triggerCoreAction } from './events';
import { onConnectionMessage } from './connection';

const LOCALSTORAGE_USERNAME_KEY = 'cowatch_username';
const LOCALSTORAGE_IMAGE_KEY = 'cowatch_image';
const LOCALSTORAGE_PRIVATETOKEN_KEY = 'cowatch_token';

const actionList = new Map<ServerMessageType, (action: ServerMessageDetails[ServerMessageType]) => void>([
	['Authorize', onConnectionResponseAuthorize],
	['HostRoom', onConnectionResponseHostRoom],
	['JoinRoom', onConnectionResponseJoinRoom],
	['UpdateRoom', onConnectionResponseUpdateRoom],
	['DisconnectRoom', onConnectionResponseDisconnectRoom],
	['ReflectRoom', onConnectionResponseReflectRoom],
	['ReflectVideoDetails', onConnectionResponseReflectVideoDetails],
]);

export function initializeConnectionMessages() {
	for(const [action, callback] of actionList) {
		onConnectionMessage(action, callback);
	}
}

function onConnectionResponseAuthorize(action: ServerMessageDetails['Authorize']) {
	getState().clientStatus = 'innactive';
	getState().client = { ...action };

	localStorage.setItem(LOCALSTORAGE_USERNAME_KEY, action.name);
	localStorage.setItem(LOCALSTORAGE_IMAGE_KEY, action.image);
	localStorage.setItem(LOCALSTORAGE_PRIVATETOKEN_KEY, action.privateToken);

	triggerClientMessage('ModuleStatus', { system: 'Connection', status: Status.OK });
	triggerCoreAction('SendRoomUISystemStatus', {
		...getState().systemStatuses,
		clientStatus: getState().clientStatus,
		serverStatus: getState().serverStatus,
		isPrimaryTab: getState().isPrimaryTab
	});
	getState().connection!.send(JSON.stringify({ actionType: 'AttemptReconnect', action: "" }));
}

function onConnectionResponseHostRoom(action: ServerMessageDetails['HostRoom']) {
	getState().clientStatus = 'host';
	getState().room = { ...action };

	triggerCoreAction('SendRoomUIUpdateRoom', { room: getState().room, status: getState().clientStatus });
	triggerCoreAction('SendPlayerInterceptorClientStatus', {
		clientStatus: getState().clientStatus,
		isPrimaryTab: getState().isPrimaryTab,
		isShowingTruePage: getState().isShowingTruePage,
		videoId: getState().videoId,
	});
}

function onConnectionResponseJoinRoom(action: ServerMessageDetails['JoinRoom']) {
	let clientType: ClientStatus = 'viewer';

	if(action.clientType === 1) clientType = 'host';

	getState().clientStatus = clientType;
	getState().room = { ...action.room };

	triggerCoreAction('SendRoomUIUpdateRoom', { room: getState().room, status: getState().clientStatus });
	triggerCoreAction('SendPlayerInterceptorClientStatus', {
		clientStatus: getState().clientStatus,
		isPrimaryTab: getState().isPrimaryTab,
		isShowingTruePage: getState().isShowingTruePage,
		videoId: getState().videoId,
	});
}

function onConnectionResponseUpdateRoom(action: ServerMessageDetails['UpdateRoom']) {
	if(getState().clientStatus === 'innactive') return;
	getState().room = { ...action };

	triggerCoreAction('SendRoomUIUpdateRoom', { room: getState().room, status: getState().clientStatus });
	triggerCoreAction('SendPlayerInterceptorClientStatus', {
		clientStatus: getState().clientStatus,
		isPrimaryTab: getState().isPrimaryTab,
		isShowingTruePage: getState().isShowingTruePage,
		videoId: getState().videoId,
	});
}

function onConnectionResponseDisconnectRoom() {
	getState().clientStatus = 'innactive';
	getState().room = {
		roomID: '',
		host: null,
		viewers: [],
		settings: {
			name: '',
		},
		createdAt: -1,
	};
	getState().isShowingTruePage = true;

	triggerCoreAction('SendRoomUIUpdateRoom', { room: getState().room, status: getState().clientStatus });
	triggerCoreAction('SendPlayerInterceptorClientStatus', {
		clientStatus: getState().clientStatus,
		isPrimaryTab: getState().isPrimaryTab,
		isShowingTruePage: getState().isShowingTruePage,
		videoId: getState().videoId,
	});
}

function onConnectionResponseReflectRoom(action: ServerMessageDetails['ReflectRoom']) {
	const currentURL = `https://youtube.com/watch?v=${getState().videoId}`;
	const newURL = `https://youtube.com/watch?v=${action.id}`;
	if(currentURL != newURL) {
		getState().isShowingTruePage = false;
		triggerCoreAction('SendState', { ...getState() });
	}

	triggerCoreAction('SendPlayerInterceptorClientStatus', {
		clientStatus: getState().clientStatus,
		isPrimaryTab: getState().isPrimaryTab,
		isShowingTruePage: getState().isShowingTruePage,
		videoId: action.id,
	});
	triggerCoreAction('UpdatePlayer', action);
}

function onConnectionResponseReflectVideoDetails(action: ServerMessageDetails['ReflectVideoDetails']) {
	if(getState().clientStatus != 'viewer') return;
	triggerCoreAction('UpdateDetails', action);
}
