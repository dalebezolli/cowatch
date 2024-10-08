import { triggerClientMessage } from './events';
import { log, LogLevel } from './log';
import { Status, Client } from './types';
import { sleep } from './utils';

const FAILED_CLIENT_COLLECTION_REATEMPT_COUNT = parseInt(process.env.TOTAL_ATTEMPTS || '0');
const FAILED_USER_COLLECTION_REATEMPT_MS = parseInt(process.env.REATTEMPT_TIME || '0');
const LOCALSTORAGE_USERNAME_KEY = 'cowatch_username';
const LOCALSTORAGE_IMAGE_KEY = 'cowatch_image';
const DEFAULT_USERNAME = 'User';

asyncCollectUser();

async function asyncCollectUser() {
	const client: Client = {
		name: '',
		image: '',
		publicToken: '',
	};

	let failedInitCount = 0;
	let didSucceed = false;

	log(LogLevel.Info, `Attempt ${failedInitCount + 1} to collect client...`)();
	while(failedInitCount < FAILED_CLIENT_COLLECTION_REATEMPT_COUNT && didSucceed === false) {
		didSucceed = collectYoutubeClient(client);
		if(!didSucceed) await sleep(FAILED_USER_COLLECTION_REATEMPT_MS);
	}

	if(!didSucceed) {
		log(LogLevel.Error, 'Failed to collect client')();
		triggerClientMessage('CollectClient', { status: Status.ERROR, client: null });
		triggerClientMessage('ModuleStatus', { system: 'ClientCollector', status: Status.ERROR });
		return;
	}

	log(LogLevel.Info, 'Collected client successfully')();
	triggerClientMessage('CollectClient', { status: Status.OK, client: client });
	triggerClientMessage('ModuleStatus', { system: 'ClientCollector', status: Status.OK });
}

function collectYoutubeClient(client: Client): boolean {
	const domUsername = document.getElementById('account-name');
	const domImage = document.getElementById('avatar-btn');

	if(!domImage) return false;
	if(domImage.getElementsByTagName('img')[0]?.src.length === 0) return false;

	let clientDefinedUsername = '';
	if(!domUsername?.textContent) {
		clientDefinedUsername = localStorage.getItem(LOCALSTORAGE_USERNAME_KEY) ?? '';
	}

	while(clientDefinedUsername === '') {
		clientDefinedUsername = prompt('What is your username?') ?? DEFAULT_USERNAME;
		clientDefinedUsername = clientDefinedUsername.trim();
	}

	client.name = domUsername?.textContent ?? clientDefinedUsername;
	client.image = localStorage.getItem(LOCALSTORAGE_IMAGE_KEY) || domImage.getElementsByTagName('img')[0].src;

	localStorage.setItem(LOCALSTORAGE_USERNAME_KEY, client.name);
	localStorage.setItem(LOCALSTORAGE_IMAGE_KEY, client.image);

	return true;
}
