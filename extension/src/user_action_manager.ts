import * as browser from 'webextension-polyfill';
import { onUserAction, triggerCoreAction } from "./events";
import { LogLevel, log } from "./log";
import { getState } from "./state";
import { Status, UserActionDetails, UserActionType } from "./types";

const EXPECTED_SERVER_RESPONSE_TIME_MULTIPLIER = parseInt(process.env.EXPECTED_SERVER_RESPONSE_TIME_MULTIPLIER);
const TOTAL_DROPPED_PING_REQUESTS_BEFORE_CONNECTION_LOST = parseInt(process.env.TOTAL_DROPPED_PING_REQUESTS_BEFORE_CONNECTION_LOST);

const actionList = new Map<UserActionType, (action: UserActionDetails[UserActionType]) => void>([
	['CollectUser', onClientCollectUser],
	['GetState', onClientGetState],
	['HostRoom', onClientRequestHostRoom],
	['JoinRoom', onClientRequestJoinRoom],
	['DisconnectRoom', onClientRequestDisconnectRoom],
	['SendReflection', onClientSendReflection],
	['Ping', onClientSendPing],
]);

export function initializeUserActions() {
	for(const [action, callback] of actionList) {
		onUserAction(action, callback);
	}
}

function onClientCollectUser(action: UserActionDetails['CollectUser']) {
	if(action.status === Status.ERROR) return;

	getState().user = { ...action.user };

	log(LogLevel.Info, 'Injecting room ui...')();
	injectRoomUI();
}

function onClientGetState() {
	triggerCoreAction('SendState', { ...getState() });
}

function onClientRequestHostRoom() {
	if(getState().serverStatus !== 'connected') {
		log(LogLevel.Error, 'No server connection found!')();
		return;
	}

	if(!getState().user) {
		log(LogLevel.Error, 'No user setup before privileged action, aborting...')();
		return;
	}

	getState().connection!.send(JSON.stringify({ actionType: 'HostRoom', action: JSON.stringify({ ...getState().user! }) }));
}

function onClientRequestJoinRoom(action: UserActionDetails['JoinRoom']) {
	if(getState().serverStatus !== 'connected') {
		log(LogLevel.Error, 'No server connection found!')();
		return;
	}

	if(!getState().user) {
		log(LogLevel.Error, 'No user setup before privileged action, aborting...')();
		return;
	}

	getState().connection!.send(JSON.stringify({ actionType: 'JoinRoom', action: JSON.stringify({ ...getState().user!, roomID: action.roomID }) }));
}

function onClientRequestDisconnectRoom() {
	if(getState().serverStatus !== 'connected') {
		log(LogLevel.Error, 'No server connection found!')();
		return;
	}

	if(!getState().user) {
		log(LogLevel.Error, 'No user setup before privileged action, aborting...')();
		return;
	}

	getState().connection!.send(JSON.stringify({ actionType: 'DisconnectRoom', action: ''}));
}

function onClientSendReflection(action: UserActionDetails['SendReflection']) {
	if(getState().serverStatus !== 'connected') {
		log(LogLevel.Error, 'No server connection found!')();
		return;
	}

	if(!getState().user) {
		log(LogLevel.Error, 'No user setup before privileged action, aborting...')();
		return;
	}

	getState().connection!.send(JSON.stringify({ actionType: 'SendReflection', action: JSON.stringify({ ...action }) }));
}

function onClientSendPing(action: UserActionDetails['Ping']) {
	if(getState().serverStatus !== 'connected') {
		log(LogLevel.Error, 'No server connection found!')();
		return;
	}

	if(!getState().user) {
		log(LogLevel.Error, 'No user setup before privileged action, aborting...')();
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
