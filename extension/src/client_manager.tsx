import * as browser from 'webextension-polyfill';
import { LogLevel, log } from './log';
import { getUser } from './user_collector';

(async function init() {
	const basicUser = await getUser();

	sendMessageToCore('EstablishConnection', basicUser);
	injectRoomUI();
})();


// TODO: Run when room is established
//injectPlayerInterceptor();

function injectPlayerInterceptor() {
	const player_interceptor_script = document.createElement('script');
	player_interceptor_script.src = browser.runtime.getURL('./player_interceptor.js');
	document.head.append(player_interceptor_script);

	log(LogLevel.Debug, 'Successfully injected player interceptor.')();
}

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

function sendMessageToCore<T extends ContentScriptActionType>(
	action: T,
	payload: ContentScriptActionBody[T]
) {
	browser.runtime.sendMessage({ action, payload });
}
