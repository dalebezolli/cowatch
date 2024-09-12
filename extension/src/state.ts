import { ClientState, Status } from "./types";

let clientState: ClientState;

export function initializeState() {
	clientState = {
		systemStatuses: {
			RoomUI: Status.ERROR,
			ClientCollector: Status.ERROR,
			PlayerInterceptor: Status.ERROR,
			Connection: Status.ERROR,
		},
		serverStatus: 'connecting',
		clientStatus: 'disconnected',
		connection: null,

		pingTimestamp: 0,
		rtt: 0,
		droppedPingRequestCount: 0,
		pingRequestTimeoutId: 0,
		pingTimeoutId: 0,

		client: null,
		videoId: location.href.split('=')[1] ?? '',
		room: null,
		isShowingTruePage: true,
		isPrimaryTab: false,
	};
}

// TODO: Find a better way to manipulate state
export function getState(): ClientState {
	return clientState;
}
