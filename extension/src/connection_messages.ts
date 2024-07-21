import { Room, ServerMessageDetails, ServerMessageType } from './types';

import { getState } from './state';
import { triggerCoreAction } from './events';
import { onConnectionMessage } from './connection';

const actionList = new Map<ServerMessageType, (action: ServerMessageDetails[ServerMessageType]) => void>([
	['HostRoom', onConnectionResponseHostRoom],
	['JoinRoom', onConnectionResponseJoinRoom],
]);

export function initializeConnectionMessages() {
	for(const [action, callback] of actionList) {
		onConnectionMessage(action, callback);
	}
}

function onConnectionResponseHostRoom(room: Room) {
	getState().clientStatus = 'host';
	getState().room = { ...room };

	triggerCoreAction('SendState', { ...getState() });
}

function onConnectionResponseJoinRoom(room: Room) {
	getState().clientStatus = 'viewer';
	getState().room = { ...room };

	triggerCoreAction('SendState', { ...getState() });
}
