import { ClientMessageType, ClientMessageDetails, CoreActionType, CoreActionDetails } from "./types";
import { LogLevel, log } from "./log";

const CLIENT_EVENT_NAME = 'CowatchClient';
const CORE_EVENT_NAME = 'CowatchCore';

/**
 * Used by client to send the appropriate message to anyone who's listening.
 */
export function triggerClientMessage<T extends ClientMessageType>(actionType: T, actionDetails: ClientMessageDetails[T]) {
	document.dispatchEvent(new CustomEvent(`${CLIENT_EVENT_NAME}:${actionType}`, {
		detail: JSON.stringify({ ...actionDetails })
	}));
}

/**
 * Used anywhere were we want to capture client messages.
 * Usually sends a message to the server.
 */
export function onClientMessage<T extends ClientMessageType>(actionType: T, callback: (actionDetails: ClientMessageDetails[T]) => void) { document.addEventListener(`${CLIENT_EVENT_NAME}:${actionType}`, (event: CustomEvent<string>) => {
		const details = JSON.parse(event.detail) as ClientMessageDetails[T];

		log(LogLevel.Info, `[${CLIENT_EVENT_NAME}:${actionType}]: `, details)();
		callback(details);
	});
}

/**
 * Used by core to send core actions.
 */
export function triggerCoreAction<T extends CoreActionType>(actionType: T, actionDetails: CoreActionDetails[T]) {
	document.dispatchEvent(new CustomEvent(`${CORE_EVENT_NAME}:${actionType}`, {
		detail: JSON.stringify({ ...actionDetails })
	}));
}

/**
 * Used anywhere we want to capture and manage core actions.
 */
export function onCoreAction<T extends CoreActionType>(actionType: T, callback: (actionDetails: CoreActionDetails[T]) => void) {
	document.addEventListener(`${CORE_EVENT_NAME}:${actionType}`, (event: CustomEvent<string>) => {
		const details = JSON.parse(event.detail) as CoreActionDetails[T];

		log(LogLevel.Info, `[${CORE_EVENT_NAME}:${actionType}]: `, details)();
		callback(details);
	});
}
