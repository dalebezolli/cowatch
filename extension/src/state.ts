import { ClientState } from "./types";

let clientState: ClientState;

export function initializeState() {
	clientState = {
		serverStatus: 'connecting',
		clientStatus: 'innactive',
		connection: null,
		user: null,
		room: null,
	};
}

// TODO: Find a better way to manipulate state
export function getState(): ClientState {
	return clientState;
}
