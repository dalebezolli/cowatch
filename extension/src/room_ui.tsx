import * as React from 'react';
import { createRoot } from 'react-dom/client';
import {
	cowatchRoot, cowatchHeader,
	cowatchError,
	cowatchFlexPushRight, cowatchTitle,

	cowatchButtonRound, cowatchButton, cowatchButtonPrimary, cowatchButtonFull,
	cowatchButtonShadow, cowatchButtonNoBrLeft, cowatchButtonSuccess, cowatchButtonError,
	cowatchInput,

	cowatchContent, cowatchContentFlexCenter, cowatchContentBackContainer,
	cowatchIconPrompt, cowatchIconPromptIcon, cowatchButtonContainer, cowatchInputButtonContainer,
	cowatchContentConnected, cowatchContentJoinlistContainer, cowatchContentConnectedButtons,
	cowatchContentClientContainer, cowatchCOntentClientIcon, cowatchContentClientHosting,

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
	const [error, setError] = React.useState('Test');
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
			<CowatchError error={error} onClose={() => setError('')} />
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

function CowatchError({ error, onClose }: { error?: string, onClose: () => void }) {
	if(!error) return;

	return (
		<div className={cowatchError} onClick={onClose}>
			<Icon icon={SVGIcon.Error} size={18} />
			<p>{error}</p>
		</div>
	);
}

function CowatchContent({ user, status, onChangeStatus }: {
	user: YoutubeUser,
	status: CowatchStatus,
	onChangeStatus: (status: CowatchStatus) => void
}) {
	let [users, setUsers] = React.useState([
		{
			username: user.username,
			icon: user.user_image,
			isMuted: false, state: 'hosting'
		},
		{
			username: 'User1',
			icon: 'https://yt3.ggpht.com/yti/ANjgQV_yCkzU6LxRLLnoDZctnqHKd2jn6Gl9mqyVYdWFzQ=s108-c-k-c0x00ffffff-no-rj',
			isMuted: true, state: 'listening'
		},
		{
			username: 'User2',
			icon: 'https://yt3.ggpht.com/yti/ANjgQV_yCkzU6LxRLLnoDZctnqHKd2jn6Gl9mqyVYdWFzQ=s108-c-k-c0x00ffffff-no-rj',
			isMuted: false, state: 'listening'
		},
	]);
	let selected_content: React.ReactElement;

	const content_initial = (
		<section className={cowatchContentFlexCenter}>
			<div className={cowatchIconPrompt}>
				<img className={cowatchIconPromptIcon} src={user.user_image} />
				<p>Start by hosting or joining a room</p>
			</div>

			<section className={cowatchButtonContainer}>
				<button
					onClick={() => onChangeStatus(CowatchStatus.Loading)}
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
		<section className={cowatchContentFlexCenter}>
			<div className={cowatchIconPrompt}>
				<img className={cowatchIconPromptIcon} src={user.user_image} />
				<p>Type room's ID</p>
			</div>

			<section className={cowatchInputButtonContainer}>
				<input id='input-room-code' placeholder='eg. 42o6N' className={cowatchInput} />
				<button
					onClick={() => onChangeStatus(CowatchStatus.Connected)}
					className={cowatchButton + ' ' + cowatchButtonPrimary + ' ' + cowatchButtonNoBrLeft}
				>
					<Icon icon={SVGIcon.Eye} size={24} />
					Join
				</button>
			</section>

			<div className={cowatchContentBackContainer}>
				<button
					onClick={() => onChangeStatus(CowatchStatus.Initial)}
					className={cowatchButton + ' ' + cowatchButtonShadow}
				>
					Go Back
				</button>
			</div>
		</section>
	);

	const content_host_options = (
		<section className={cowatchContentFlexCenter}>
			<p>Host options</p>

			<div onClick={() => onChangeStatus(CowatchStatus.Initial)} className={cowatchContentBackContainer}>
				<button className={cowatchButton + ' ' + cowatchButtonShadow}>
					Go Back
				</button>
			</div>
		</section>
	);

	const content_loading = (
		<section className={cowatchContentFlexCenter}>
			<p>Loading ...</p>
		</section>
	);

	const content_connected = (
		<section className={cowatchContentConnected}>
			<ul className={cowatchContentJoinlistContainer} >
				{
					users.length && users.map(user => (
						<li key={user.username} className={cowatchContentClientContainer}>
							<img src={user.icon} className={cowatchCOntentClientIcon} />
							{user.username}

							{
								user.state === 'hosting' && (
									<div className={cowatchContentClientHosting}>
										<Icon icon={SVGIcon.Broadcast} size={18} />
										Hosting
									</div>
								)
							}

							{
								user.isMuted && (
									<Icon icon={SVGIcon.Mute} size={18} />
								)
							}

							<button className={cowatchButtonRound + ' ' + cowatchFlexPushRight}>
								<Icon icon={SVGIcon.Kebab} size={18} />
							</button>
						</li>
					))
				}
			</ul>

			<section className={cowatchContentConnectedButtons}>
				<button
					onClick={() => onChangeStatus(CowatchStatus.Initial)}
					className={cowatchButton + ' ' + cowatchButtonError}
				>
					<Icon icon={SVGIcon.PhoneDisconnect} size={24} />
					Disconnect
				</button>
				<button
					onClick={() => onChangeStatus(CowatchStatus.Options)}
					className={cowatchButtonRound + ' ' + cowatchFlexPushRight}
				>
					<Icon icon={SVGIcon.Cog} size={24} />
				</button>
			</section>
		</section>
	);

	const content_options = (
		<section className={cowatchContentConnected}>
			<ul className={cowatchContentJoinlistContainer} >
			</ul>

			<section className={cowatchContentConnectedButtons}>
				<button
					onClick={() => onChangeStatus(CowatchStatus.Initial)}
					className={cowatchButton + ' ' + cowatchButtonSuccess}
				>
					<Icon icon={SVGIcon.CheckMark} size={24} />
					Save
				</button>
				<button
					onClick={() => onChangeStatus(CowatchStatus.Initial)}
					className={cowatchButton + ' ' + cowatchButtonError}
				>
					<Icon icon={SVGIcon.XMark} size={24} />
					Exit
				</button>
			</section>
		</section>
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
		case SVGIcon.CheckMark:
			dom_icon = (
				<svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path d="M1 13.6L7.28571 20L23 4" stroke="#F1F1F1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			);
			break;
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
		case SVGIcon.PhoneDisconnect:
			dom_icon = (
				<svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path d="M8.77964 8.5L9.26995 5.8699L7.81452 2H4.0636C2.93605 2 2.04804 2.93086 2.2164 4.04576C2.50361 5.94771 3.17338 8.90701 4.72526 11.7468M10.9413 13.5C11.778 14.244 12.7881 14.8917 14 15.5L18.1182 14.702L22 16.1812V19.7655C22 20.9575 20.9679 21.8664 19.8031 21.613C16.9734 20.9974 11.9738 19.506 8.22388 16.1812" stroke="#F1F1F1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
					<path d="M21 3L3 21" stroke="#F1F1F1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			);
			break;
		case SVGIcon.Cog:
			dom_icon = (
				<svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="#F1F1F1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
					<path d="M19.6224 10.3954L18.5247 7.7448L20 6L18 4L16.2647 5.48295L13.5578 4.36974L12.9353 2H10.981L10.3491 4.40113L7.70441 5.51596L6 4L4 6L5.45337 7.78885L4.3725 10.4463L2 11V13L4.40111 13.6555L5.51575 16.2997L4 18L6 20L7.79116 18.5403L10.397 19.6123L11 22H13L13.6045 19.6132L16.2551 18.5155C16.6969 18.8313 18 20 18 20L20 18L18.5159 16.2494L19.6139 13.598L21.9999 12.9772L22 11L19.6224 10.3954Z" stroke="#F1F1F1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			);
			break;
		case SVGIcon.Broadcast:
			dom_icon = (
				<svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path d="M17.5 8C17.5 8 19 9.5 19 12C19 14.5 17.5 16 17.5 16" stroke="#F1F1F1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
					<path d="M20.5 5C20.5 5 23 7.5 23 12C23 16.5 20.5 19 20.5 19" stroke="#F1F1F1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
					<path d="M6.5 8C6.5 8 5 9.5 5 12C5 14.5 6.5 16 6.5 16" stroke="#F1F1F1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
					<path d="M3.5 5C3.5 5 1 7.5 1 12C1 16.5 3.5 19 3.5 19" stroke="#F1F1F1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
					<path d="M12 13C12.5523 13 13 12.5523 13 12C13 11.4477 12.5523 11 12 11C11.4477 11 11 11.4477 11 12C11 12.5523 11.4477 13 12 13Z" fill="#F1F1F1" stroke="#F1F1F1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			);
			break;
		case SVGIcon.Mute:
			dom_icon = (
				<svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path d="M18 14L20.0005 12M20.0005 12L22 10M20.0005 12L18 10M20.0005 12L22 14" stroke="#F1F1F1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
					<path d="M2 13.8571V10.1429C2 9.03829 2.89543 8.14286 4 8.14286H6.9C7.09569 8.14286 7.28708 8.08544 7.45046 7.97772L13.4495 4.02228C14.1144 3.5839 15 4.06075 15 4.85714V19.1429C15 19.9392 14.1144 20.4161 13.4495 19.9777L7.45046 16.0223C7.28708 15.9146 7.09569 15.8571 6.9 15.8571H4C2.89543 15.8571 2 14.9617 2 13.8571Z" stroke="#F1F1F1" strokeWidth="1.5" />
				</svg>
			);
			break;
		case SVGIcon.Kebab:
			dom_icon = (
				<svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path d="M12 5H12.0001" stroke="#F1F1F1" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
					<path d="M12 12H12.0001" stroke="#F1F1F1" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
					<path d="M12 19H12.0001" stroke="#F1F1F1" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			);
			break;
		case SVGIcon.Error:
			dom_icon = (
				<svg width={size} height={size} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
					<g clip-path="url(#clip0_149_598)">
						<path d="M9 5.25V9.75" stroke="#F1F1F1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
						<path d="M9 12.7575L9.0075 12.7492" stroke="#F1F1F1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
						<path d="M9 16.5C13.1421 16.5 16.5 13.1421 16.5 9C16.5 4.85786 13.1421 1.5 9 1.5C4.85786 1.5 1.5 4.85786 1.5 9C1.5 13.1421 4.85786 16.5 9 16.5Z" stroke="#F1F1F1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
					</g>
					<defs>
						<clipPath id="clip0_149_598">
							<rect width="18" height="18" fill="white" />
						</clipPath>
					</defs>
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
	CheckMark,
	XMark,
	Group,
	Eye,
	ArrowLeft,
	PhoneDisconnect,
	Cog,
	Broadcast,
	Mute,
	Kebab,
	Error,
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