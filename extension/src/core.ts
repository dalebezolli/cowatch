import * as browser from 'webextension-polyfill';

import { LogLevel, log } from './log';
import { getState, initializeState } from './state';
import { initializeConnection } from './connection';
import { initializeConnectionMessages } from './connection_messages';
import { initializeUserActions } from './user_actions';

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
	initializeUserActions();
	initializeConnectionMessages();

	log(LogLevel.Info, 'Injecting user info collector...')();
	collectUser();
}

function collectUser() {
	const domScriptUserCollector = document.createElement('script');
	domScriptUserCollector.src = browser.runtime.getURL('./user_collector.js');
	domScriptUserCollector.defer = true;
	document.head.append(domScriptUserCollector);
}
