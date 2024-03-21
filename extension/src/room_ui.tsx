import * as React from 'react';
import { createRoot } from 'react-dom/client';
import {
	cowatchRoot, cowatchHeader,
	cowatchFlexPushRight, cowatchTitle,

	cowatchButtonRound, cowatchButton, cowatchButtonPrimary, cowatchButtonFull,

	cowatchContent, cowatchContentInitial, cowatchContentBackContainer,
	cowatchIconPrompt, cowatchIconPromptIcon, cowatchButtonContainer

} from './room_ui.module.css';

import { LogLevel, log } from './log';

const FAILED_INITIALIZATION_TOTAL_ATTEMPT = 25;
const FAILED_INITIALIZATION_REATEMPT_MS = 1000;
let failed_initialization_attempt_count = 0;

initializeRoot();

async function initializeRoot() {
	const root_container = document.getElementById('secondary-inner');
	log(LogLevel.Debug, 'Initializing root', root_container)();

	if(!root_container && failed_initialization_attempt_count <= FAILED_INITIALIZATION_TOTAL_ATTEMPT) {
		failed_initialization_attempt_count++;
		log(LogLevel.Warn, `Attempt ${failed_initialization_attempt_count} to reinitialize frontend... Retying in ${FAILED_INITIALIZATION_REATEMPT_MS / 1000}`)();
		setTimeout(initializeRoot, FAILED_INITIALIZATION_REATEMPT_MS);
		return;
	} else if(!root_container) {
		log(LogLevel.Error, 'Failed to initialize frontend')();
		return;
	}

	let youtube_user: YoutubeUser;
	try {
		youtube_user = await getYoutubeUser();
	} catch(error) {
		log(LogLevel.Error, 'Failed to collect user information')();
		return;
	}

	log(LogLevel.Debug, 'Collected user information: ', youtube_user)();

	const cowatch_container = document.createElement('div');
	cowatch_container.id = 'cowatch-container';
	cowatch_container.style.marginBottom = '8px';
	root_container.prepend(cowatch_container);

	const cowatch_root = createRoot(cowatch_container);
	cowatch_root.render(<Cowatch user={youtube_user} />);
}

function Cowatch({ user }: { user: YoutubeUser }) {
	const [open, setOpen] = React.useState(true);
	const [content_status, setContentStatus] = React.useState(CowatchStatus.Initial);

	const toggleClose = () => {
		setOpen(!open);
	};

	if(!open) {
		return (
			<button className={cowatchButton + ' ' + cowatchButtonFull} onClick={toggleClose}>Show Room</button>
		);
	}

	return (
		<section id='cowatch-root' className={cowatchRoot}>
			<CowatchHeader onPressX={toggleClose} />
			<CowatchContent
				user={user}
				status={content_status}
				onChangeStatus={setContentStatus}
			/>
		</section>
	);
}

function CowatchHeader({ onPressX }: { onPressX: (event) => void }) {
	return (
		<header className={cowatchHeader}>
			<h2 className={cowatchTitle}>cowatch</h2>
			<button
				className={cowatchButtonRound + ' ' + cowatchFlexPushRight}
				onClick={onPressX}
			><Icon icon={SVGIcon.XMark} size={28} /></button>
		</header>
	);
}

function CowatchContent({ user, status, onChangeStatus }: { user: YoutubeUser, status: CowatchStatus, onChangeStatus: (status: CowatchStatus) => void }) {
	let selected_content: React.ReactElement;

	const content_initial = (
		<section className={cowatchContentInitial}>
			<div className={cowatchIconPrompt}>
				<img className={cowatchIconPromptIcon} src={user.user_image} />
				<p>Start by hosting or joining a room</p>
			</div>

			<section className={cowatchButtonContainer}>
				<button
					onClick={() => onChangeStatus(CowatchStatus.HostOptions)}
					className={cowatchButton + ' ' + cowatchButtonPrimary}
				>
					<Icon icon={SVGIcon.Group} size={24} />
					Host
				</button>

				<button
					onClick={() => onChangeStatus(CowatchStatus.Join)}
					className={cowatchButton + ' ' + cowatchButtonPrimary}
				>
					<Icon icon={SVGIcon.Eye} size={24} />
					Join
				</button>
			</section>
		</section>
	);

	const content_join = (
		<section className={cowatchContentInitial}>
			<div className={cowatchIconPrompt}>
				<img className={cowatchIconPromptIcon} src={user.user_image} />
				<p>Type room's ID</p>
			</div>

			<section className={cowatchButtonContainer}>
				<button
					onClick={() => onChangeStatus(CowatchStatus.Connected)}
					className={cowatchButton + ' ' + cowatchButtonPrimary}
				>
					<Icon icon={SVGIcon.Eye} size={24} />
					Join
				</button>
			</section>

			<div className={cowatchContentBackContainer}>
				<button onClick={() => onChangeStatus(CowatchStatus.Initial)} className={cowatchButton}>
					Go Back
				</button>
			</div>
		</section>
	);

	const content_host_options = (
		<section className={cowatchContentInitial}>
			<p>Host options</p>

			<div onClick={() => onChangeStatus(CowatchStatus.Initial)} className={cowatchContentBackContainer}>
				<button className={cowatchButton}>
					Go Back
				</button>
			</div>
		</section>
	);

	const content_loading = (
		<section className={cowatchContentInitial}>
			<p>Loading ...</p>
		</section>
	);

	const content_connected = (
		<section>
			<section>
			</section>
			<section>
				<button>
				</button>
			</section>
		</section>
	);

	const content_options = (
		<>
			<p>Options</p>
		</>
	);

	switch(status) {
		case CowatchStatus.Initial:
			selected_content = content_initial;
			break;
		case CowatchStatus.Join:
			selected_content = content_join;
			break;
		case CowatchStatus.HostOptions:
			selected_content = content_host_options;
			break;
		case CowatchStatus.Options:
			selected_content = content_options;
			break;
		case CowatchStatus.Connected:
			selected_content = content_connected;
			break;
		case CowatchStatus.Loading:
			selected_content = content_loading;
			break;
	}

	return (
		<div className={cowatchContent}>
			{selected_content}
		</div>
	);
}

function Icon({ icon, size }: { icon: SVGIcon, size: number }) {
	let dom_icon: React.ReactElement;

	switch(icon) {
		case SVGIcon.XMark:
			dom_icon = (
				<svg width={size} height={size} viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
					<path d='M6.7583 17.2426L12.0009 12M12.0009 12L17.2435 6.75735M12.0009 12L6.7583 6.75735M12.0009 12L17.2435 17.2426' stroke='#F1F1F1' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
				</svg>
			);
			break;
		case SVGIcon.Group:
			dom_icon = (
				<svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path d="M1 20V19C1 15.134 4.13401 12 8 12C11.866 12 15 15.134 15 19V20" stroke="#F1F1F1" strokeWidth="1.5" strokeLinecap="round" />
					<path d="M13 14C13 11.2386 15.2386 9 18 9C20.7614 9 23 11.2386 23 14V14.5" stroke="#F1F1F1" strokeWidth="1.5" strokeLinecap="round" />
					<path d="M8 12C10.2091 12 12 10.2091 12 8C12 5.79086 10.2091 4 8 4C5.79086 4 4 5.79086 4 8C4 10.2091 5.79086 12 8 12Z" stroke="#F1F1F1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
					<path d="M18 9C19.6569 9 21 7.65685 21 6C21 4.34315 19.6569 3 18 3C16.3431 3 15 4.34315 15 6C15 7.65685 16.3431 9 18 9Z" stroke="#F1F1F1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			);
			break;
		case SVGIcon.Eye:
			dom_icon = (
				<svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path d="M3 13C6.6 5 17.4 5 21 13" stroke="#F1F1F1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
					<path d="M12 17C10.3431 17 9 15.6569 9 14C9 12.3431 10.3431 11 12 11C13.6569 11 15 12.3431 15 14C15 15.6569 13.6569 17 12 17Z" fill="#F1F1F1" stroke="#F1F1F1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			);
			break;
		case SVGIcon.ArrowLeft:
			dom_icon = (
				<svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path d="M23 12H1M1 12L11.3889 2M1 12L11.3889 22" stroke="#F1F1F1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			);
			break;
		default:
			dom_icon = <div></div>
	}

	return dom_icon;
}

async function getYoutubeUser(): Promise<YoutubeUser> {
	log(LogLevel.Debug, 'Getting user details')();
	let failed_attempt = 0;
	let youtube_user: YoutubeUser = { username: '', user_image: '' };
	let hasError = false;

	do {
		hasError = false;

		try {
			youtube_user = await attemptGetYoutubeUser();
		} catch(error) {
			failed_attempt++;
			log(LogLevel.Warn, `Attempt ${failed_attempt} to collect user details... Retying in ${FAILED_INITIALIZATION_REATEMPT_MS / 1000}`)();
			hasError = true;
		}

		if(hasError) {
			await new Promise((resolve, _) => {
				setTimeout(() => resolve(null), FAILED_INITIALIZATION_REATEMPT_MS)
			});
		}
	} while(hasError && failed_attempt <= FAILED_INITIALIZATION_TOTAL_ATTEMPT);

	if(hasError) {
		throw new Error('Cannot collect user info from specified dom elements');
	}

	return youtube_user;

	async function attemptGetYoutubeUser(): Promise<YoutubeUser> {
		let username = document.getElementById('account-name')?.textContent ?? 'User';
		let user_image = document.getElementById('avatar-btn')?.getElementsByTagName('img')[0]?.src ?? '';

		if(!username || !user_image) throw new Error('Faiiled to collect user data');

		return { username, user_image };
	}
}

enum SVGIcon {
	XMark,
	Group,
	Eye,
	ArrowLeft
};

enum CowatchStatus {
	Initial,
	HostOptions,
	Join,
	Loading,
	Connected,
	Options
};

type YoutubeUser = {
	username: string,
	user_image: string,
}
