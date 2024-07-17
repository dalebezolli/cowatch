import * as browser from 'webextension-polyfill';
import { onUserAction } from "./events";
import { LogLevel, log } from "./log";
import { getState } from "./state";
import { Status, UserActionDetails, UserActionType } from "./types";

const actionList = new Map<UserActionType, (action: UserActionDetails[UserActionType]) => void>([
	['CollectUser', onClientCollectUser],
	['HostRoom', onClientRequestHostRoom],
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

function onClientRequestHostRoom() {
	if(getState().serverStatus !== 'connected') {
		log(LogLevel.Error, 'No server connection found to host room!')();
		return;
	}

	if(!getState().user) {
		log(LogLevel.Error, 'No user setup before privileged action, aborting...')();
		return;
	}

	getState().connection!.send(JSON.stringify({ actionType: 'HostRoom', action: JSON.stringify({ ...getState().user! }) }));
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
