import { log, LogLevel } from './log';
import { sleep } from './utils';

const FAILED_USER_COLLECTION_REATEMPT_MS = 5000;
const FAILED_USER_COLLECTION_REATEMPT_COUNT = 1000;

getUser();

async function getUser() {
	try {
		const user = await getYoutubeUser();
		log(LogLevel.Info, `Successfully Collected user: ${user.name}`)();
	} catch(err) {
		log(LogLevel.Error, 'No user could be found.')();
	}
}

async function getYoutubeUser() {
	const user = {
		name: '',
		image: '',
	}

	let domUsername: HTMLElement | null;
	let domImage: HTMLElement | null;

	let didCollectUserData = false;
	let collectAttempt = 0;

	while(collectAttempt < FAILED_USER_COLLECTION_REATEMPT_COUNT && !didCollectUserData) {
		log(LogLevel.Info, `Attempting to collect user information (Attempt ${collectAttempt + 1})`)();
		try {
			domUsername = document.getElementById('account-name');
			domImage = document.getElementById('avatar-btn');

			if(!domImage) throw new Error('Could not find username or userimage sources.');
			if(domImage.getElementsByTagName('img')[0]?.src.length === 0) throw new Error('Username or User Image missing from sources.');

			user.name = domUsername?.textContent ?? 'User';
			user.image = domImage.getElementsByTagName('img')[0].src;
			
			didCollectUserData = true;
		} catch(err) {
			collectAttempt++;
			await sleep(FAILED_USER_COLLECTION_REATEMPT_MS);
		}
	}

	if(!didCollectUserData) throw new Error('Cannot collect user information.');

	return user;
}
