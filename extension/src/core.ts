import * as browser from 'webextension-polyfill';

import { LogLevel, log } from './log';
import { getState, initializeState } from './state';
import { initializeConnection } from './connection';
import { initializeConnectionMessages } from './connection_messages';
import { initializeClientMessageHandlers } from './client_message_handlers';
import { triggerCoreAction } from './events';

onStartup();

async function onStartup() {
	log(LogLevel.Info, 'Initializing Cowatch State...')();
	initializeState();

	log(LogLevel.Info, 'Preparing event handlers...')();
	initializeClientMessageHandlers();
	initializeConnectionMessages();

	browser.runtime.onMessage.addListener((message) => {
		log(LogLevel.Info, 'Background message: ', message)();
		getState().isPrimaryTab = message.isActive;

		log(LogLevel.Debug, 'browser:onMessage - Client status:', getState().client)();

		if(!message.isActive) {
			getState().clientStatus = 'disconnected';
			getState().serverStatus = 'failed';
			clearInterval(getState().pingRequestIntervalId);
			triggerCoreAction('SendPlayerInterceptorClientStatus', {
				clientStatus: getState().clientStatus,
				isPrimaryTab: getState().isPrimaryTab,
				isShowingTruePage: getState().isShowingTruePage,
				videoId: getState().videoId,
			});
		}

		if(getState().serverStatus === 'failed') {
			log(LogLevel.Info, 'Creating Cowatch Server Connection...')();
			triggerCoreAction('SendRoomUISystemStatus', {
				...getState().systemStatuses,
				clientStatus: getState().clientStatus,
				serverStatus: getState().serverStatus,
				isPrimaryTab: getState().isPrimaryTab
			});
			// initializeConnection(getState());
		}
	});
	browser.runtime.sendMessage({ action: 'GetCurrentID' });

	log(LogLevel.Info, 'Injecting room ui...')();
	injectRoomUI();

	log(LogLevel.Info, 'Injecting client info collector...')();
	connectYoutubeInterceptor();
}

function connectYoutubeInterceptor() {
	const domScriptPlayerInterceptor = document.createElement('script');
	domScriptPlayerInterceptor.src = browser.runtime.getURL('./player_interceptor.js');
	domScriptPlayerInterceptor.defer = true;
	document.head.append(domScriptPlayerInterceptor);
}

function injectRoomUI() {
	const domScriptRoomUI = document.createElement('script');
	domScriptRoomUI.src = browser.runtime.getURL('./room_ui.js');
	domScriptRoomUI.defer = true;
	document.head.append(domScriptRoomUI);
	log(LogLevel.Info, 'Testing...')();

	const domLinkCSSRoomUI = document.createElement('link');
	domLinkCSSRoomUI.href = browser.runtime.getURL('./room_ui.css');
	domLinkCSSRoomUI.rel = 'stylesheet';
	document.head.append(domLinkCSSRoomUI);
}
