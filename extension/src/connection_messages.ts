import { Room, ServerMessageDetails, ServerMessageType } from './types';

import { getState } from './state';
import { triggerCoreAction } from './events';
import { onConnectionMessage } from './connection';

const actionList = new Map<ServerMessageType, (action: ServerMessageDetails[ServerMessageType]) => void>([
	['HostRoom', onConnectionResponseHostRoom],
	['JoinRoom', onConnectionResponseJoinRoom],
	['DisconnectRoom', onConnectionResponseDisconnectRoom],
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

function onConnectionResponseDisconnectRoom(action: ServerMessageDetails['DisconnectRoom']) {
	getState().clientStatus = 'innactive';
	getState().room = {
		roomID: '',
		host: null,
		viewers: [],
	};

	triggerCoreAction('SendState', { ...getState() });
}
