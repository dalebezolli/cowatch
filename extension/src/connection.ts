import { log, LogLevel } from './log';
import { sleep } from './utils'
import { ClientState, ResolutionStrategy, ServerMessage, ServerMessageDetails, ServerMessageType, Status, Timestamp } from './types';
import { triggerCoreAction, triggerClientMessage } from './events';
import { timeStamp } from 'console';

const FAILED_CONNECTION_REATTEMPT_MS = parseInt(process.env.REATTEMPT_TIME);
const COWATCH_OWL_SERVER_WEBSOCKET = `${process.env.ADDRESS_OWL}/${process.env.ENDPOINT_WS_OWL}`;
const EXPECTED_SERVER_RESPONSE_TIME_MULTIPLIER = parseInt(process.env.EXPECTED_SERVER_RESPONSE_TIME_MULTIPLIER);
const TOTAL_DROPPED_PING_REQUESTS_BEFORE_CONNECTION_LOST = parseInt(process.env.TOTAL_DROPPED_PING_REQUESTS_BEFORE_CONNECTION_LOST);
const PING_REQUEST_INTERVAL = parseInt(process.env.PING_REQUEST_INTERVAL);

const eventCallbacks = new Map<ServerMessageType, (action: ServerMessageDetails[ServerMessageType]) => void>();

export async function initializeConnection(clientState: ClientState) {
	if(clientState.serverStatus === 'connecting' || clientState.serverStatus === 'connected') return;

	triggerClientMessage('ModuleStatus', { system: 'Connection', status: Status.OK});
	let tenRTTChunk = [];
	let averageRTT = Infinity;
	let rtt = Infinity;

	while(true) {
		tenRTTChunk = [];
		averageRTT = Infinity;
		rtt = Infinity;

		clientState.serverStatus = 'connecting';
		triggerClientMessage('ModuleStatus', { system: 'Connection', status: Status.OK});

		log(LogLevel.Info, 'Successfully established connection to server.')();
		let connection = await attemptConnection();

		clientState.serverStatus = 'connected';
		clientState.connection = connection;
		clientState.connection.addEventListener('message', handleConnectionMessage);

		triggerClientMessage('ModuleStatus', { system: 'Connection', status: Status.OK});

		let droppedRequests = 0;
		while(droppedRequests < TOTAL_DROPPED_PING_REQUESTS_BEFORE_CONNECTION_LOST && clientState.serverStatus === 'connected') {
			let startTime = Date.now();
			clientState.connection.send(JSON.stringify({ actionType: 'Ping', action: JSON.stringify({ timeStamp: startTime }) }));
			log(LogLevel.Info, `[Ping] Pinging server`)();

			let pongResponse = await new Promise<{ status: Status, endTime: Timestamp }>((resolve, _) => {
				let timeout = 0;
				clientState.connection.addEventListener('message', event => {
					const messageData = JSON.parse(event.data) as ServerMessage;
					if(messageData.actionType !== 'Pong') return;

					const details = messageData.action as ServerMessageDetails[typeof messageData.actionType];

					clearTimeout(timeout);
					resolve({status: Status.OK, endTime: details.timestamp });
				});

				timeout = window.setTimeout(() => {
					return resolve({ status: Status.ERROR, endTime: Infinity });
				}, EXPECTED_SERVER_RESPONSE_TIME_MULTIPLIER * ((averageRTT === Infinity) ? 1000 : averageRTT));
			});

			log(LogLevel.Debug, 'Status:', pongResponse)();
			if(pongResponse.status === Status.ERROR) {
				log(LogLevel.Warn, `[Ping] Failed to get a pong response in time (failed ${droppedRequests + 1} times)`)();
				droppedRequests++;
				continue;
			}

			droppedRequests = 0;
			rtt = Math.abs(pongResponse.endTime - startTime);

			tenRTTChunk.push(rtt);
			if(tenRTTChunk.length > 10) tenRTTChunk.shift();
			averageRTT = Math.round(tenRTTChunk.reduce((acc, curr) => acc + curr, 0) / tenRTTChunk.length);

			log(LogLevel.Debug, 'RTT:', {rtt, averageRTT, tenRTTChunk})();

			await sleep(PING_REQUEST_INTERVAL * 1000);
		}
	}
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

		if(messageData.actionType === 'HostRoom' && messageData.errorMessage.startsWith('The room name')) {
			resolutionStrategy = 'displayOnInput';
		}

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
	let callback = eventCallbacks.get(messageData.actionType);

	if(callback == null) return;
	callback(eventDetails);
}

async function attemptConnection(): Promise<WebSocket> {
	let connection: WebSocket = null;
	let isConnected = false;
	let connectionAttempt = 0;

	while(!isConnected) {
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

	return connection;
}
