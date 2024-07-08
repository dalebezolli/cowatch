import * as browser from 'webextension-polyfill';
import { LogLevel, log } from './log';
import { sleep } from './utils';

const FAILED_CONNECTION_TOTAL_ATTEMPT = 5;
const FAILED_CONNECTION_REATTEMPT_MS = 5000;
const COWATCH_OWL_SERVER_HOST = '192.168.2.50:8080';

type ServerStatus = 'connecting' | 'connected' | 'failed';

type ClientState = {
	serverStatus: ServerStatus,
	username:	  String,
	usericon:	  String,
}

const clientState = {
	serverStatus: 'connecting' as ServerStatus,
	username:	  '',
	usericon:	  '',
} as ClientState;

/* Event Handler Initialization */
onStartup();


/* Event Handlers */
async function onStartup() {
	log(LogLevel.Info, 'Creating Cowatch Server Connection...')();

	await connectToServer(clientState);

	if(clientState.serverStatus === 'failed') {
		log(LogLevel.Error, 'Failed to establish connection with the server. Either the service is down or you\'re running an outdated version of the extension.')();
		return;
	}

	log(LogLevel.Info, 'Injecting user info collector...')();
	injectUserCollector();
	log(LogLevel.Info, 'Injecting room ui...')();
	injectRoomUI();
}

/* Functions */
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

function injectUserCollector() {
	const domScriptUserCollector = document.createElement('script');
	domScriptUserCollector.src = browser.runtime.getURL('./user_collector.js');
	domScriptUserCollector.defer = true;
	document.head.append(domScriptUserCollector);
}

async function connectToServer(clientState: ClientState) {
	clientState.serverStatus = 'connecting';

	let connection: WebSocket | null = null;

	let isConnected = false;
	let connectionAttempt = 0;

	while(connectionAttempt < FAILED_CONNECTION_TOTAL_ATTEMPT && !isConnected) {
		log(LogLevel.Info, `Attempting to establish connnection to server (Attempt ${connectionAttempt + 1})`)();

		try {
			connection = await new Promise((resolve: (value: WebSocket) => void, reject: (value: Error) => void) => {
				const connectionSetup = new WebSocket(`ws://${COWATCH_OWL_SERVER_HOST}/reflect`);

				connectionSetup.addEventListener('open', () => resolve(connectionSetup));
				connectionSetup.addEventListener('error', () => reject(new Error('Failed to establish connection with the server.')));
			});

			isConnected = true;
		} catch(error) {
			connectionAttempt++;
			await sleep(FAILED_CONNECTION_REATTEMPT_MS);
		}
	}

	if(!isConnected) {
		clientState.serverStatus = 'failed';
		return;
	}

	clientState.serverStatus = 'connected';
	log(LogLevel.Debug, 'Successfully created connection to server.')();
}
