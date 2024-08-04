import { log, LogLevel } from './log';
import { sleep } from './utils'
import { ClientState, ResolutionStrategy, ServerMessage, ServerMessageDetails, ServerMessageType, Status } from './types';
import { triggerCoreAction, triggerClientMessage } from './events';

const FAILED_CONNECTION_TOTAL_ATTEMPT = parseInt(process.env.TOTAL_ATTEMPTS);
const FAILED_CONNECTION_REATTEMPT_MS = parseInt(process.env.REATTEMPT_TIME);
const COWATCH_OWL_SERVER_WEBSOCKET = `${process.env.ADDRESS_OWL}/${process.env.ENDPOINT_WS_OWL}`;
const PING_REQUEST_INTERVAL = parseInt(process.env.PING_REQUEST_INTERVAL);

const eventCallbacks = new Map<ServerMessageType, (action: ServerMessageDetails[ServerMessageType]) => void>();

export async function initializeConnection(clientState: ClientState) {
	clientState.serverStatus = 'connecting';

	const isConnected = await attemptConnection(clientState);
	if(!isConnected) {
		clientState.serverStatus = 'failed';
		return;
	}

	log(LogLevel.Info, 'Successfully created connection to server.')();
	clientState.connection!.addEventListener('message', handleConnectionMessage);
	clientState.serverStatus = 'connected';
	
	// Initial call to figure out request rtt
	triggerClientMessage('Ping', { timestamp: Date.now() });
	window.setInterval(() => {
		triggerClientMessage('Ping', { timestamp: Date.now() });
	}, PING_REQUEST_INTERVAL * 1000);
}

export function onConnectionMessage(messageType: ServerMessageType, messageCallback: (action: ServerMessageDetails[ServerMessageType]) => void){
	eventCallbacks.set(messageType, messageCallback);
}

function handleConnectionMessage(event: MessageEvent<string>) {
	const messageData = JSON.parse(event.data) as ServerMessage;
	log(LogLevel.Info, `[ServerMessage:${messageData.actionType}]`, messageData.action)();

	if(messageData.status !== Status.OK) {
		log(LogLevel.Error, `[ServerMessage:${messageData.actionType}]`, messageData.errorMessage)();
		let resolutionStrategy: ResolutionStrategy = 'returnToInitial';

		if(messageData.actionType === 'JoinRoom') {
			resolutionStrategy = 'stayOnCurrentView';
		}

		if(messageData.actionType === 'ReflectRoom') {
			resolutionStrategy = 'stayOnCurrentView';
		}

		triggerCoreAction('SendError', {
			error: messageData.errorMessage,
			actionType: messageData.actionType,
			resolutionStrategy,
		})
		return;
	}
	
	const eventDetails = messageData.action as ServerMessageDetails[typeof messageData.actionType];
	eventCallbacks.get(messageData.actionType)(eventDetails);
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
