import * as browser from 'webextension-polyfill';

import { LogLevel, log } from './log';
import { getState, initializeState } from './state';
import { initializeConnection } from './connection';
import { initializeConnectionMessages } from './connection_messages';
import { initializeClientMessageHandlers } from './client_message_handlers';

onStartup();

async function onStartup() {
	log(LogLevel.Info, 'Initializing Cowatch State...')();
	initializeState();

	log(LogLevel.Info, 'Creating Cowatch Server Connection...')();
	await initializeConnection(getState());
	if(getState().serverStatus !== 'connected') {
		log(LogLevel.Error, 'Failed to establish connection with the server. Either the service is down or you\'re running an outdated version of the extension.')();
		return;
	}

	log(LogLevel.Info, 'Preparing event handlers...')();
	initializeClientMessageHandlers();
	initializeConnectionMessages();

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
