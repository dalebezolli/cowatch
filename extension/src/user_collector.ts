import { triggerUserAction } from './events';
import { log, LogLevel } from './log';
import { Status, User } from './types';
import { sleep } from './utils';

const FAILED_USER_COLLECTION_REATEMPT_MS = 5000;
const FAILED_USER_COLLECTION_REATEMPT_COUNT = 1000;

asyncCollectUser();

async function asyncCollectUser() {
	const user = {
		name: '',
		image: '',
	};

	let failedInitCount = 0;
	let didSucceed = false;

	log(LogLevel.Info, `Attempt ${failedInitCount + 1} to collect user...`)();
	while(failedInitCount < FAILED_USER_COLLECTION_REATEMPT_COUNT && didSucceed === false) {
		didSucceed = collectYoutubeUser(user);
		if(!didSucceed) await sleep(FAILED_USER_COLLECTION_REATEMPT_MS);
	}

	if(!didSucceed) log(LogLevel.Error, 'Failed to collect user')();

	log(LogLevel.Info, 'Collected user successfully')();
	triggerUserAction('CollectUser', { status: Status.OK, user })
}

function collectYoutubeUser(user: User): boolean {
	const domUsername = document.getElementById('account-name');
	const domImage = document.getElementById('avatar-btn');

	if(!domImage) return false;
	if(domImage.getElementsByTagName('img')[0]?.src.length === 0) return false;

	let userDefinedUsername = 'User';
	if(!domUsername?.textContent) {
		userDefinedUsername = prompt('What is your username?') ?? userDefinedUsername;
	}

	user.name = domUsername?.textContent ?? userDefinedUsername;
	user.image = domImage.getElementsByTagName('img')[0].src;

	return true;
}
