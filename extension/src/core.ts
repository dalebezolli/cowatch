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

		if(!message.isActive) {
			getState().clientStatus = 'disconnected';
			clearInterval(getState().pingRequestIntervalId);
			triggerCoreAction('SendPlayerInterceptorClientStatus', {
				clientStatus: getState().clientStatus,
				isPrimaryTab: getState().isPrimaryTab,
				isShowingTruePage: getState().isShowingTruePage,
				videoId: getState().videoId,
			});

			return;
		}

		initializeConnection(getState());
	});
	browser.runtime.sendMessage({ action: 'GetCurrentID' });

	log(LogLevel.Info, 'Creating Cowatch Server Connection...')();
	initializeConnection(getState());

	log(LogLevel.Info, 'Injecting room ui...')();
	injectRoomUI();

	log(LogLevel.Info, 'Injecting client info collector...')();
	collectClient();
	connectYoutubeInterceptor();
}

function collectClient() {
	const domScriptClientCollector = document.createElement('script');
	domScriptClientCollector.src = browser.runtime.getURL('./client_collector.js');
	domScriptClientCollector.defer = true;
	document.head.append(domScriptClientCollector);
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
