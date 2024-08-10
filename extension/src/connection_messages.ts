import { ClientStatus, ServerMessageDetails, ServerMessageType } from './types';

import { getState } from './state';
import { triggerCoreAction } from './events';
import { onConnectionMessage } from './connection';
import { log, LogLevel } from './log';

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
	['Pong', onConnectionResponsePong],
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

	triggerCoreAction('SendState', { ...getState() });
}

function onConnectionResponseHostRoom(action: ServerMessageDetails['HostRoom']) {
	getState().clientStatus = 'host';
	getState().room = { ...action };

	triggerCoreAction('SendState', { ...getState() });
}

function onConnectionResponseJoinRoom(action: ServerMessageDetails['JoinRoom']) {
	let clientType: ClientStatus = 'viewer';

	if(action.clientType === 1) clientType = 'host';

	getState().clientStatus = clientType;
	getState().room = { ...action.room };

	triggerCoreAction('SendState', { ...getState() });
}

function onConnectionResponseUpdateRoom(action: ServerMessageDetails['UpdateRoom']) {
	if(getState().clientStatus === 'innactive') return;
	getState().room = { ...action };

	triggerCoreAction('SendState', { ...getState() });
}

function onConnectionResponseDisconnectRoom(action: ServerMessageDetails['DisconnectRoom']) {
	getState().clientStatus = 'innactive';
	getState().room = {
		roomID: '',
		host: null,
		viewers: [],
	};
	getState().isShowingTruePage = true;

	triggerCoreAction('SendState', { ...getState() });


}

function onConnectionResponseReflectRoom(action: ServerMessageDetails['ReflectRoom']) {
	const currentURL = `https://youtube.com/watch?v=${getState().videoId}`;
	const newURL = `https://youtube.com/watch?v=${action.id}`;
	if(currentURL != newURL) {
		getState().videoId = action.id;
		getState().isShowingTruePage = false;
		triggerCoreAction('SendState', { ...getState() });
	}

	triggerCoreAction('UpdatePlayer', action);
}

function onConnectionResponseReflectVideoDetails(action: ServerMessageDetails['ReflectVideoDetails']) {
	triggerCoreAction('UpdateDetails', action);
}

function onConnectionResponsePong(action: ServerMessageDetails['Pong']) {
	getState().rtt = Math.abs(action.timestamp - getState().pingTimestamp);
	clearTimeout(getState().pingTimeoutId);

	getState().pingTimestamp = 0;
	getState().pingTimeoutId = 0;
	getState().droppedPingRequestCount = 0;
	log(LogLevel.Info, `RTT: ${getState().rtt}`)();
}
