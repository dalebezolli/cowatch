import * as browser from 'webextension-polyfill';
import { LogLevel, log } from './log';

const FAILED_CONNECTION_TOTAL_ATTEMPT = 5;
const FAILED_CONNECTION_REATTEMPT_MS = 5000;
const COWATCH_OWL_SERVER_URL = 'ws://192.168.2.30:8080/test';

const cowatch_state = {
	failed_connection_attempt: 0,
	managed_tab_id: -1,
	server_status: 'disconnected' as ServerStatus,
	username: 'User',
	room_settings: {
		room_id: '',
		connected_clients: [] as Array<Client>
	}
} as CowatchState;



/* Event Handler Initialization */
onStartup(cowatch_state);

browser.runtime.onInstalled.addListener(onInstalled);



/* Event Handlers */
async function onStartup(cowatch_state: CowatchState) {
	log(LogLevel.Debug, 'Initializing cowatch...')();
	cowatch_state.server_status = 'disconnected' as ServerStatus;

	await createConnectionToServer(cowatch_state);
	if(cowatch_state.server_status !== 'connected') return;

	cowatch_state.server_connection.addEventListener('message', () => {
		// TODO: Handle server messages
		onServerMessage();
	})
}

function onInstalled() {
	log(LogLevel.Debug, 'Installed')();
}

function onServerMessage() { }

function onClientMessage() { }



/* FUNCTIONS */
async function createConnectionToServer(cowatch_state: CowatchState) {
	log(LogLevel.Debug, 'Creating connection to server');
	cowatch_state.server_status = 'connecting';

	let connection: WebSocket | null = null;
	try {
		connection = await new Promise((resolve: (value: WebSocket) => void, reject: (value: Error) => void) => {
			const connection = new WebSocket(COWATCH_OWL_SERVER_URL);
			connection.addEventListener('open', () => {
				resolve(connection);
			});

			connection.addEventListener('error', () => {
				log(LogLevel.Warn, `Connection Attempt ${++cowatch_state.failed_connection_attempt}. Reattempting in ${FAILED_CONNECTION_REATTEMPT_MS / 1000} seconds...`)();

				if(cowatch_state.failed_connection_attempt > FAILED_CONNECTION_TOTAL_ATTEMPT) {
					reject(new Error('Reached max attempts'));
					return;
				}

				setTimeout(() => createConnectionToServer(cowatch_state), FAILED_CONNECTION_REATTEMPT_MS);
			});

		});
	} catch(error) {
		log(LogLevel.Error, 'Failed to establish connection to server', error)();
		return;
	}

	if(connection?.readyState === 3) return;
	cowatch_state.server_connection = connection;
	cowatch_state.server_status = 'connected';
	log(LogLevel.Debug, 'Successfully created connection to server.')();
}



/* DEFINITIONS */
type ServerStatus = 'disconnected' | 'connecting' | 'connected';

type Client = {
	username: string,
	role: ClientRole
}
type ClientRole = 'hosting' | 'listening';

type CowatchState = {
	failed_connection_attempt: number,
	managed_tab_id: number,
	server_connection: WebSocket,
	server_status: ServerStatus,
	username: string,
	room_settings: {
		room_id: string,
		connected_clients: Array<Client>
	}
}
