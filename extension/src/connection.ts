import { log, LogLevel } from './log';
import { sleep } from './utils'
import { ClientState, ServerEvent, ServerMessageDetails, ServerMessageType, Status } from './types';

const FAILED_CONNECTION_TOTAL_ATTEMPT = 5;
const FAILED_CONNECTION_REATTEMPT_MS = 5000;
const COWATCH_OWL_SERVER_WEBSOCKET = 'ws://192.168.2.50:8080/reflect';

const eventCallbacks = new Map<ServerMessageType, (action: ServerMessageDetails[ServerMessageType]) => void>();

export async function initializeConnection(clientState: ClientState) {
	clientState.serverStatus = 'connecting';

	const isConnected = await attemptConnection(clientState);
	if(!isConnected) {
		clientState.serverStatus = 'failed';
		return;
	}

	log(LogLevel.Debug, 'Successfully created connection to server.')();
	clientState.connection!.addEventListener('message', handleConnectionMessage);
	clientState.serverStatus = 'connected';
}

export function onConnectionMessage(messageType: ServerMessageType, messageCallback: (action: ServerMessageDetails[ServerMessageType]) => void){
	eventCallbacks.set(messageType, messageCallback);
}

function handleConnectionMessage(event: MessageEvent<string>) {
	const messageData = JSON.parse(event.data) as ServerEvent;
	log(LogLevel.Info, `[ServerMessage:${messageData.actionType}]`, messageData.action)();

	if(messageData.status !== Status.OK) {
		log(LogLevel.Error, `[ServerMessage:${messageData.actionType}]`, messageData.errorMessage)();
		return;
	}

	eventCallbacks.get(messageData.actionType)(JSON.parse(messageData.action) as ServerMessageDetails[typeof messageData.actionType]);
}

async function attemptConnection(clientState: ClientState): Promise<boolean> {
	let connection: WebSocket | null = null;
	let isConnected = false;
	let connectionAttempt = 0;

	while(connectionAttempt < FAILED_CONNECTION_TOTAL_ATTEMPT && !isConnected) {
		log(LogLevel.Info, `Attempting to establish connnection to server (Attempt ${connectionAttempt + 1})`)();

		try {
			connection = await new Promise((resolve: (value: WebSocket) => void, reject: (value: Error) => void) => {
				const connectionSetup = new WebSocket(COWATCH_OWL_SERVER_WEBSOCKET);

				connectionSetup.addEventListener('open', () => resolve(connectionSetup));
				connectionSetup.addEventListener('error', () => reject(new Error('Failed to establish connection with the server.')));
			});

			isConnected = true;
		} catch(error) {
			connectionAttempt++;
			await sleep(FAILED_CONNECTION_REATTEMPT_MS);
		}
	}

	clientState.connection = connection;
	return isConnected;
}