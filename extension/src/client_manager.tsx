import * as browser from 'webextension-polyfill';
import { LogLevel, log } from './log';

function injectPlayerInterceptor() {
	const player_interceptor_script = document.createElement('script');
	player_interceptor_script.src = browser.runtime.getURL('./player_interceptor.js');
	document.head.append(player_interceptor_script);

	log(LogLevel.Debug, 'Successfully injected player interceptor.')();
}

// TODO: Run when server message arrives
injectPlayerInterceptor();
