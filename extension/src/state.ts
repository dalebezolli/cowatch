import { ClientState } from "./types";

let clientState: ClientState;

export function initializeState() {
	clientState = {
		serverStatus: 'connecting',
		clientStatus: 'innactive',
		connection: null,

		pingTimestamp: 0,
		rtt: 0,
		droppedPingRequestCount: 0,
		pingTimeoutId: 0,

		client: null,
		videoId: location.href.split('=')[1] ?? '',
		room: null,
		isShowingTruePage: true,
	};
}

// TODO: Find a better way to manipulate state
export function getState(): ClientState {
	return clientState;
}
