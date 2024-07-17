import { UserActionType, UserActionDetails, CoreActionType, CoreActionDetails } from "./types";
import { LogLevel, log } from "./log";

const USER_EVENT_NAME = 'CowatchUser';
const CORE_EVENT_NAME = 'CowatchCore';

export function triggerUserAction<T extends UserActionType>(actionType: T, actionDetails: UserActionDetails[T]) {
	document.dispatchEvent(new CustomEvent(`${USER_EVENT_NAME}:${actionType}`, {
		detail: JSON.stringify({ ...actionDetails })
	}));
}

export function onUserAction<T extends UserActionType>(actionType: T, callback: (actionDetails: UserActionDetails[T]) => void) {
	document.addEventListener(`${USER_EVENT_NAME}:${actionType}`, (event: CustomEvent<string>) => {
		const details = JSON.parse(event.detail) as UserActionDetails[T];

		log(LogLevel.Info, `[${USER_EVENT_NAME}:${actionType}]: `, details)();
		callback(details);
	});
}

export function triggerCoreAction<T extends CoreActionType>(actionType: T, actionDetails: CoreActionDetails[T]) {
	document.dispatchEvent(new CustomEvent(`${CORE_EVENT_NAME}:${actionType}`, {
		detail: JSON.stringify({ ...actionDetails })
	}));
}

export function onCoreAction<T extends CoreActionType>(actionType: T, callback: (actionDetails: CoreActionDetails[T]) => void) {
	document.addEventListener(`${CORE_EVENT_NAME}:${actionType}`, (event: CustomEvent<string>) => {
		const details = JSON.parse(event.detail) as CoreActionDetails[T];

		log(LogLevel.Info, `[${CORE_EVENT_NAME}:${actionType}]: `, details)();
		callback(details);
	});
}
