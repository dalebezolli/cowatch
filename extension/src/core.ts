import * as browser from 'webextension-polyfill';
import { LogLevel, log } from './log';


log(LogLevel.Debug, 'Started')();

browser.runtime.onInstalled.addListener(() => {
	log(LogLevel.Debug, 'Installed')();
});
