/**
 * Client Message Handlers
 *
 * This file contains the handlers for client sent events which are managed by core.
 * A client message handler that also sends data to the server starts with "onClientMessageRequest"
 * instead of the "onClientMessage" prefix
 */

import * as browser from 'webextension-polyfill';
import { onClientMessage, triggerCoreAction } from "./events";
import { LogLevel, log } from "./log";
import { getState } from "./state";
import { Status, ClientMessageDetails, ClientMessageType, AuthorizedClient } from "./types";

const EXPECTED_SERVER_RESPONSE_TIME_MULTIPLIER = parseInt(process.env.EXPECTED_SERVER_RESPONSE_TIME_MULTIPLIER);
const TOTAL_DROPPED_PING_REQUESTS_BEFORE_CONNECTION_LOST = parseInt(process.env.TOTAL_DROPPED_PING_REQUESTS_BEFORE_CONNECTION_LOST);

/**
 * Contains client actions that core is listening and responding to
 */
const actionList = new Map<ClientMessageType, (action: ClientMessageDetails[ClientMessageType]) => void>([
	['CollectClient', onClientMessageCollectClient],
	['GetState', onClientMessageGetState],

	['Authorize', onClientMessageRequestAuhtorize],
	['HostRoom', onClientMessageRequestHostRoom],
	['JoinRoom', onClientMessageRequestJoinRoom],
	['DisconnectRoom', onClientMessageRequestDisconnectRoom],
	['SendReflection', onClientMessageRequestReflection],

	['Ping', onClientMessageRequestPing],
]);

export function initializeClientMessageHandlers() {
	for(const [action, callback] of actionList) {
		onClientMessage(action, callback);
	}
}

function onClientMessageCollectClient(action: ClientMessageDetails['CollectClient']) {
	if(action.status === Status.ERROR) return;

	getState().client = { ...action.client, publicToken: '', privateToken: '' };

	log(LogLevel.Info, 'Injecting room ui...')();
	injectRoomUI();
}

function onClientMessageGetState() {
	triggerCoreAction('SendState', { ...getState() });
}

function onClientMessageRequestAuhtorize() {
	if(getState().serverStatus !== 'connected') {
		log(LogLevel.Error, 'No server connection found!')();
		return;
	}

	getState().connection!.send(JSON.stringify({ actionType: 'Authorize', action: JSON.stringify({ ...getState().client, privateToken: '' }) }));
}

function onClientMessageRequestHostRoom() {
	if(getState().serverStatus !== 'connected') {
		log(LogLevel.Error, 'No server connection found!')();
		return;
	}

	if(!getState().client) {
		log(LogLevel.Error, 'No client setup before privileged action, aborting...')();
		return;
	}

	getState().connection!.send(JSON.stringify({ actionType: 'HostRoom', action: '' }));
}

function onClientMessageRequestJoinRoom(action: ClientMessageDetails['JoinRoom']) {
	if(getState().serverStatus !== 'connected') {
		log(LogLevel.Error, 'No server connection found!')();
		return;
	}

	if(!getState().client) {
		log(LogLevel.Error, 'No client setup before privileged action, aborting...')();
		return;
	}

	getState().connection!.send(JSON.stringify({ actionType: 'JoinRoom', action: JSON.stringify({ roomID: action.roomID }) }));
}

function onClientMessageRequestDisconnectRoom() {
	if(getState().serverStatus !== 'connected') {
		log(LogLevel.Error, 'No server connection found!')();
		return;
	}

	if(!getState().client) {
		log(LogLevel.Error, 'No client setup before privileged action, aborting...')();
		return;
	}

	getState().connection!.send(JSON.stringify({ actionType: 'DisconnectRoom', action: ''}));
}

function onClientMessageRequestReflection(action: ClientMessageDetails['SendReflection']) {
	if(getState().serverStatus !== 'connected') {
		log(LogLevel.Error, 'No server connection found!')();
		return;
	}

	if(!getState().client) {
		log(LogLevel.Error, 'No client setup before privileged action, aborting...')();
		return;
	}

	if(getState().room.roomID === '') {
		log(LogLevel.Error, 'No room found before sending a reflection, aborting...')();
		return;
	}

	getState().connection!.send(JSON.stringify({ actionType: 'SendReflection', action: JSON.stringify({ ...action }) }));
}

function onClientMessageRequestPing(action: ClientMessageDetails['Ping']) {
	if(getState().serverStatus !== 'connected') {
		log(LogLevel.Error, 'No server connection found!')();
		return;
	}

	if(!getState().client) {
		log(LogLevel.Error, 'No client setup before privileged action, aborting...')();
		return;
	}

	getState().pingTimestamp = action.timestamp;

	let worstCaseExpectedResponseTime: number;
	if(getState().rtt === 0) {
		worstCaseExpectedResponseTime = 10 * 1000;
	} else {
		worstCaseExpectedResponseTime = EXPECTED_SERVER_RESPONSE_TIME_MULTIPLIER * getState().rtt;
	}

	getState().connection!.send(JSON.stringify({ actionType: 'Ping', action: JSON.stringify({ ...action }) }));
	log(LogLevel.Debug, "Expected response time (ms):", worstCaseExpectedResponseTime)();
	getState().pingTimeoutId = window.setTimeout(() => {
		getState().droppedPingRequestCount++;
		log(LogLevel.Warn, `[Ping] Request ${getState().droppedPingRequestCount} failed to get a response`)();

		if(getState().droppedPingRequestCount >= TOTAL_DROPPED_PING_REQUESTS_BEFORE_CONNECTION_LOST) {
			triggerCoreAction('SendError', {
				error: 'Server could not be reached',
				actionType: 'Pong',
				resolutionStrategy: 'returnToInitial'
			});
			log(LogLevel.Error, `[Ping] Could not create a connection between the server`)();
		}
	}, worstCaseExpectedResponseTime);
}

function injectRoomUI() {
	const domScriptRoomUI = document.createElement('script');
	domScriptRoomUI.src = browser.runtime.getURL('./room_ui.js');
	domScriptRoomUI.defer = true;
	document.head.append(domScriptRoomUI);

	const domLinkCSSRoomUI = document.createElement('link');
	domLinkCSSRoomUI.href = browser.runtime.getURL('./room_ui.css');
	domLinkCSSRoomUI.rel = 'stylesheet';
	document.head.append(domLinkCSSRoomUI);
}
