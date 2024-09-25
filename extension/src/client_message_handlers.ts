/**
 * Client Message Handlers
 *
 * This file contains the handlers for client sent events which are managed by core.
 * A client message handler that also sends data to the server starts with "onClientMessageRequest"
 * instead of the "onClientMessage" prefix
 */

import * as browser from 'webextension-polyfill';
import { onClientMessage, triggerClientMessage, triggerCoreAction } from "./events";
import { LogLevel, log } from "./log";
import { getState } from "./state";
import { Status, ClientMessageDetails, ClientMessageType } from "./types";

const EXPECTED_SERVER_RESPONSE_TIME_MULTIPLIER = parseInt(process.env.EXPECTED_SERVER_RESPONSE_TIME_MULTIPLIER);
const TOTAL_DROPPED_PING_REQUESTS_BEFORE_CONNECTION_LOST = parseInt(process.env.TOTAL_DROPPED_PING_REQUESTS_BEFORE_CONNECTION_LOST);
const LOCALSTORAGE_PRIVATETOKEN_KEY = 'cowatch_token';

/**
 * Contains client actions that core is listening and responding to
 */
const actionList = new Map<ClientMessageType, (action: ClientMessageDetails[ClientMessageType]) => void>([
	['CollectClient', onClientMessageCollectClient],
	['SwitchActiveTab', onClientSwitchActiveTab],
	['ShowTruePage', onClientShowTruePage],
	['GetState', onClientMessageGetState],

	['ModuleStatus', onClientMessageModuleStatus],

	['Authorize', onClientMessageRequestAuthorize],
	['HostRoom', onClientMessageRequestHostRoom],
	['JoinRoom', onClientMessageRequestJoinRoom],
	['DisconnectRoom', onClientMessageRequestDisconnectRoom],
	['SendReflection', onClientMessageRequestReflection],
	['SendVideoDetails', onClientMessageRequestVideoDetails],
]);

export function initializeClientMessageHandlers() {
	for(const [action, callback] of actionList) {
		onClientMessage(action, callback);
	}
}

function onClientMessageCollectClient(action: ClientMessageDetails['CollectClient']) {
	if(action.status === Status.ERROR) return;
	getState().client = { ...action.client, publicToken: '', privateToken: '' };
}

function onClientSwitchActiveTab() {
	browser.runtime.sendMessage({ action: 'UpdateActiveID' });
}

function onClientShowTruePage(clientAction: ClientMessageDetails['ShowTruePage']) {
	getState().videoId = clientAction.videoId;
	location.assign(`https://youtube.com/watch?v=${clientAction.videoId}`);
}

function onClientMessageGetState() {
	triggerCoreAction('SendState', { ...getState() });
}

async function onClientMessageModuleStatus(action: ClientMessageDetails['ModuleStatus']) {
	getState().systemStatuses[action.system] = action.status;

	let systemsOk = true;
	for(let systemOk of Object.values(getState().systemStatuses)) {
		systemsOk &&= Status.OK === systemOk;
	}

	log(LogLevel.Info,
		'Current system statuses:', {
		...getState().systemStatuses,
		serverStatus: getState().serverStatus,
		clientStatus: getState().clientStatus,
		isPrimaryTab: getState().isPrimaryTab
	})();
	if(!systemsOk) return;

	log(LogLevel.Info, 'Sending client to room ui.', getState().client)();
	const { name, image, publicToken }  = getState().client;
	triggerCoreAction('SendRoomUIClient', { name, image, publicToken });

	if(getState().clientStatus === 'disconnected' && getState().serverStatus === 'connected') {
		log(LogLevel.Info, 'Authorizing client.')();
		triggerClientMessage('Authorize', {});
	}

	triggerCoreAction('SendRoomUISystemStatus', {
		...getState().systemStatuses,
		clientStatus: getState().clientStatus,
		serverStatus: getState().serverStatus,
		isPrimaryTab: getState().isPrimaryTab
	});
}

function onClientMessageRequestAuthorize() {
	if(getState().isPrimaryTab == false) {
		log(LogLevel.Error, 'This is not the primary tab!')();
		return;
	}

	if(getState().serverStatus !== 'connected') {
		log(LogLevel.Error, 'No server connection found!')();
		return;
	}

	const cachedToken = localStorage.getItem(LOCALSTORAGE_PRIVATETOKEN_KEY) ?? '';

	const authorizationBody = { ...getState().client, privateToken: cachedToken };
	log(LogLevel.Info, 'Authorizing with:', authorizationBody)();
	getState().connection!.send(JSON.stringify({ actionType: 'Authorize', action: JSON.stringify(authorizationBody) }));
}

function onClientMessageRequestHostRoom(action: ClientMessageDetails['HostRoom']) {
	if(getState().serverStatus !== 'connected') {
		log(LogLevel.Error, 'No server connection found!')();
		return;
	}

	if(!getState().client) {
		log(LogLevel.Error, 'No client setup before privileged action, aborting...')();
		return;
	}

	getState().connection!.send(JSON.stringify({ actionType: 'HostRoom', action: JSON.stringify(action) }));
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

function onClientMessageRequestVideoDetails(action: ClientMessageDetails['SendVideoDetails']) {
	if(getState().serverStatus !== 'connected') {
		log(LogLevel.Error, 'No server connection found!')();
		return;
	}

	if(!getState().client) {
		log(LogLevel.Error, 'No client setup before privileged action, aborting...')();
		return;
	}

	if(getState().room.roomID === '') {
		log(LogLevel.Error, 'No room found before sending video details, aborting...')();
		return;
	}

	getState().connection!.send(JSON.stringify({ actionType: 'SendVideoDetails', action: JSON.stringify({ ...action }) }));
}
