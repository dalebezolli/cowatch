import * as browser from 'webextension-polyfill';
import { LogLevel, log } from './log';

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

	// TODO: Inject user collection
	injectRoomUI();
}

/* Functions */
function injectRoomUI() {
	log(LogLevel.Debug, 'Attempting to inject room ui')();
	const script_room_ui = document.createElement('script');
	script_room_ui.src = browser.runtime.getURL('./room_ui.js');
	script_room_ui.defer = true;
	document.head.append(script_room_ui);

	const link_room_ui_css = document.createElement('link');
	link_room_ui_css.href = browser.runtime.getURL('./room_ui.css');
	link_room_ui_css.rel = 'stylesheet';
	document.head.append(link_room_ui_css);
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
			await new Promise((resolve, _) => setTimeout(() => resolve(true), FAILED_CONNECTION_REATTEMPT_MS));
		}
	}

	if(!isConnected) {
		clientState.serverStatus = 'failed';
		return;
	}

	clientState.serverStatus = 'connected';
	log(LogLevel.Debug, 'Successfully created connection to server.')();
}
