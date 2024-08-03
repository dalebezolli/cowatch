import { ServerMessageDetails, ServerMessageType } from './types';

import { getState } from './state';
import { triggerCoreAction } from './events';
import { onConnectionMessage } from './connection';
import { log, LogLevel } from './log';

const actionList = new Map<ServerMessageType, (action: ServerMessageDetails[ServerMessageType]) => void>([
	['HostRoom', onConnectionResponseHostRoom],
	['JoinRoom', onConnectionResponseJoinRoom],
	['UpdateRoom', onConnectionResponseUpdateRoom],
	['DisconnectRoom', onConnectionResponseDisconnectRoom],
	['ReflectRoom', onConnectionResponseReflectRoom],
	['Pong', onConnectionResponsePong],
]);

export function initializeConnectionMessages() {
	for(const [action, callback] of actionList) {
		onConnectionMessage(action, callback);
	}
}

function onConnectionResponseHostRoom(action: ServerMessageDetails['HostRoom']) {
	getState().clientStatus = 'host';
	getState().room = { ...action };

	triggerCoreAction('SendState', { ...getState() });
}

function onConnectionResponseJoinRoom(action: ServerMessageDetails['JoinRoom']) {
	getState().clientStatus = 'viewer';
	getState().room = { ...action };

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

	triggerCoreAction('SendState', { ...getState() });
}

function onConnectionResponseReflectRoom(action: ServerMessageDetails['ReflectRoom']) {
	triggerCoreAction('UpdatePlayer', action);
}

function onConnectionResponsePong(action: ServerMessageDetails['Pong']) {
	getState().rtt = Math.abs(action.timestamp - getState().pingTimestamp);
	clearTimeout(getState().pingTimeoutId);

	getState().pingTimestamp = 0;
	getState().pingTimeoutId = 0;
	getState().droppedPingRequestCount = 0;
	log(LogLevel.Info, `RTT: ${getState().rtt}`)();
}
