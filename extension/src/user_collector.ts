import { log, LogLevel } from './log';

const FAILED_USER_COLLECTION_REATEMPT_MS = 2000;

async function getUser(): Promise<BasicUser> {
	log(LogLevel.Debug, 'Getting user details')();
	let failed_attempt = 0;
	let youtube_user: BasicUser = { username: '', user_image: '' };
	let hasError = false;

	do {
		if(hasError) {
			log(LogLevel.Warn, `Reatempt ${failed_attempt} to collect user details... Retying in ${FAILED_USER_COLLECTION_REATEMPT_MS / 1000}`)();
			await sleep(FAILED_USER_COLLECTION_REATEMPT_MS);
		}

		try {
			youtube_user = await attemptGetYoutubeUser();
			hasError = false;
		} catch(error) {
			hasError = true;
			failed_attempt++;
		}
	} while(hasError && failed_attempt);

	if(hasError) {
		throw new Error('Cannot collect user info from specified dom elements');
	}

	return youtube_user;
}

async function attemptGetYoutubeUser(): Promise<BasicUser> {
	let username = document.getElementById('display-name')?.textContent ?? '';
	let user_image = document.getElementById('avatar-btn')?.getElementsByTagName('img')[0]?.src ?? '';

	if(!username || !user_image) throw new Error('Faiiled to collect user data');

	return { username, user_image };
}

async function sleep(ms: number) {
	await new Promise((resolve, _) => {
		setTimeout(() => resolve(null), ms)
	});
}

export { getUser };
