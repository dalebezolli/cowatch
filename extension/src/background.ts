import { log, LogLevel } from './log'
import * as browser from 'webextension-polyfill';

let currentActiveTab = -1;

browser.runtime.onMessage.addListener(async (message, sender) => {
	if(message?.action == null) return;
	if(sender?.tab?.id == null) return;

	switch(message.action) {
		case 'GetCurrentID':
			getCurrentId(sender.tab.id);
		break;
		case 'UpdateActiveID':
			await updateActiveId(sender.tab.id);
		break;
	}
});

browser.tabs.onRemoved.addListener((tabId) => {
	if(currentActiveTab !== tabId) return;

	log(LogLevel.Info, 'Closing active tab: ', tabId)();
	currentActiveTab = -1;
});

function getCurrentId(id: number) {
	let isActive = false;

	if(currentActiveTab === -1 || currentActiveTab === id) {
		isActive = true;
		currentActiveTab = id;
	}

	log(LogLevel.Info, `Preparing youtube instance active=${isActive} currentActive=${currentActiveTab}`)();
	browser.tabs.sendMessage(id, { id, isActive });
}

async function updateActiveId(id: number) {
	currentActiveTab = id;

	const youtubeInstanceTabs = await browser.tabs.query({ url: '*://*.youtube.com/*' });
	for(const tab of youtubeInstanceTabs) {
		browser.tabs.sendMessage(tab.id, { id: tab.id, isActive: tab.id === currentActiveTab });
	}

	log(LogLevel.Info, 'Updating youtube instances', youtubeInstanceTabs)();
}
