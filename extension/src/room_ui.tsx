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
	cowatchContentClientContainer, cowatchCOntentClientIcon

} from './room_ui.module.css';

import { LogLevel, log } from './log';
import { onCoreAction, triggerUserAction } from './events';
import { CowatchContentProps, CowatchContentInitialProps, CowatchErrorProps, CowatchHeaderProps, CowatchStatus, Room, User, CowatchContentJoinOptionsProps, CowatchContentConnectedProps, SVGIcon, IconProps } from './types';
import { sleep } from './utils';

const FAILED_INITIALIZATION_TOTAL_ATTEMPTS = 25;
const FAILED_INITIALIZATION_REATEMPT_MS = 1000;

initializeRoot();

async function initializeRoot() {
	let failedInitCount = 0;
	let didSucceed = false;

	log(LogLevel.Info, `Attempt ${failedInitCount + 1} to initialize frontend...`)();
	while(failedInitCount < FAILED_INITIALIZATION_TOTAL_ATTEMPTS && didSucceed === false) {
		didSucceed = attemptToInitializeRoot();
		if(!didSucceed) await sleep(FAILED_INITIALIZATION_REATEMPT_MS);
	}

	if(!didSucceed) {
		log(LogLevel.Error, 'Failed to initialize frontend')();
	}

	log(LogLevel.Info, 'Initialized frontend successfully')();
}

function attemptToInitializeRoot(): boolean {
	const rootContainer = document.getElementById('secondary-inner');

	if(rootContainer == null) {
		return false;
	}

	const cowatchContainer = document.createElement('div');
	cowatchContainer.id = 'cowatch-container';
	cowatchContainer.style.marginBottom = '8px';
	rootContainer.prepend(cowatchContainer);

	const cowatchRoot = createRoot(cowatchContainer);
	cowatchRoot.render(<Cowatch />);

	return true;
}

function Cowatch() {
	const [open, setOpen] = React.useState(true);
	const [error, setError] = React.useState('');
	const [contentStatus, setContentStatus] = React.useState(CowatchStatus.Initial);
	const [roomState, setRoomState] = React.useState<Room>({
		roomID: '',
		host: null,
		viewers: [],
	});

	const [userState, setUserState] = React.useState<User>({
		name: '',
		image: '',
	});

	React.useEffect(() => {
		onCoreAction('HostRoom', handleHosting);
	}, []);

	function handleHosting({ room }: { room: Room }) {
		setRoomState(room);
		setContentStatus(CowatchStatus.Connected);
	}


	const toggleClose = () => setOpen(!open);

	if(!open) return <button className={cowatchButton + ' ' + cowatchButtonFull} onClick={toggleClose}>Show Room</button>

	return (
		<section id='cowatch-root' className={cowatchRoot}>
			<CowatchHeader onPressClose={toggleClose} />
			<CowatchError error={error} onClose={() => setError('')} />
			<CowatchContent
				room={roomState}
				user={userState}
				status={contentStatus}
				onChangeStatus={setContentStatus}
			/>
		</section>
	);
}

function CowatchHeader({ onPressClose }: CowatchHeaderProps) {
	return (
		<header className={cowatchHeader}>
			<h2 className={cowatchTitle}>cowatch</h2>
			<button
				className={cowatchButtonRound + ' ' + cowatchFlexPushRight}
				onClick={onPressClose}
			>
				<Icon icon={SVGIcon.XMark} size={28} />
			</button>
		</header>
	);
}

function CowatchError({ error, onClose }: CowatchErrorProps) {
	if(!error) return;

	return (
		<div className={cowatchError} onClick={onClose}>
			<Icon icon={SVGIcon.Error} size={18} />
			<p>{error}</p>
		</div>
	);
}

function CowatchContent({ room, user, status, onChangeStatus }: CowatchContentProps) {
	let selectedContent: React.ReactElement;
	
	function onRequestHost() {
		onChangeStatus(CowatchStatus.Loading);
		triggerUserAction('HostRoom', {});
	}

	function onRequestJoin() {
		onChangeStatus(CowatchStatus.Loading);
		// triggerUserAction('JoinRoom', {roomID: room.roomID});
	}

	function onRequestDisconnect() {
		onChangeStatus(CowatchStatus.Loading);
		// triggerUserAction();
	}

	function onSettings() {
		onChangeStatus(CowatchStatus.Options);
	}

	switch(status) {
		case CowatchStatus.Initial:
			selectedContent = <CowatchContentInitial user={user} onHost={onRequestHost} onJoin={onRequestJoin} />;
			break;
		case CowatchStatus.Join:
			selectedContent = <CowatchContentJoinOptions user={user} />;
			break;
		case CowatchStatus.HostOptions:
			selectedContent = <CowatchContentHostOptions />;
			break;
		case CowatchStatus.Options:
			selectedContent = <CowatchContentOptions />;
			break;
		case CowatchStatus.Connected:
			selectedContent = <CowatchContentConnected user={user} room={room} onDisconnect={onRequestDisconnect} onSettings={onSettings} />;
			break;
		case CowatchStatus.Loading:
			selectedContent = (
				<section className={cowatchContentFlexCenter}>
					<p>Loading ...</p>
				</section>
			)
			break;
	}

	return (
		<div className={cowatchContent}>
			{selectedContent}
		</div>
	);
}

function CowatchContentInitial({ user, onHost, onJoin }: CowatchContentInitialProps) {
	return (
		<section className={cowatchContentFlexCenter}>
			<div className={cowatchIconPrompt}>
				<img className={cowatchIconPromptIcon} src={user.image} />
				<p>Start by hosting or joining a room</p>
			</div>

			<section className={cowatchButtonContainer}>
				<button
					onClick={onHost}
					className={cowatchButton + ' ' + cowatchButtonPrimary}
				>
					<Icon icon={SVGIcon.Group} size={24} />
					Host
				</button>

				<button
					onClick={onJoin}
					className={cowatchButton + ' ' + cowatchButtonPrimary}
				>
					<Icon icon={SVGIcon.Eye} size={24} />
					Join
				</button>
			</section>
		</section>
	);
}

function CowatchContentJoinOptions({ user }: CowatchContentJoinOptionsProps) {
	return (
		<section className={cowatchContentFlexCenter}>
			<div className={cowatchIconPrompt}>
				<img className={cowatchIconPromptIcon} src={user.image} />
				<p>Type room's ID</p>
			</div>

			<section className={cowatchInputButtonContainer}>
				<input id='input-room-code' placeholder='eg. 42o6N' className={cowatchInput} />
				<button
					onClick={() => null}
					className={cowatchButton + ' ' + cowatchButtonPrimary + ' ' + cowatchButtonNoBrLeft}
					>
					<Icon icon={SVGIcon.Eye} size={24} />
					Join
				</button>
			</section>

			<div className={cowatchContentBackContainer}>
				<button
					onClick={() => null}
					className={cowatchButton + ' ' + cowatchButtonShadow}
					>
					Go Back
				</button>
			</div>
		</section>
	);
}

function CowatchContentHostOptions() {
	return (
		<section className={cowatchContentFlexCenter}>
			<p>Host options</p>

			<div onClick={() => null} className={cowatchContentBackContainer}>
				<button className={cowatchButton + ' ' + cowatchButtonShadow}>
					Go Back
				</button>
			</div>
		</section>
	);
}

function CowatchContentConnected({ user, room, onDisconnect, onSettings }: CowatchContentConnectedProps) {
	return (
		<section className={cowatchContentConnected}>
			<ul className={cowatchContentJoinlistContainer} >
				{
					room.host ? (
						<li key={room.host.name} className={cowatchContentClientContainer}>
							<img src={room.host.image} className={cowatchCOntentClientIcon} />
							{room.host.name}

							<button className={cowatchButtonRound + ' ' + cowatchFlexPushRight}>
								<Icon icon={SVGIcon.Kebab} size={18} />
							</button>
						</li>
					) : null
				}

				{
					room.viewers.length ? room.viewers.map(user => (
					<li key={user.name} className={cowatchContentClientContainer}>
							<img src={user.image} className={cowatchCOntentClientIcon} />
							{user.name}

							<button className={cowatchButtonRound + ' ' + cowatchFlexPushRight}>
								<Icon icon={SVGIcon.Kebab} size={18} />
							</button>
						</li>
						)) :
					null
				}
			</ul>

			<section className={cowatchContentConnectedButtons}>
				<button
					onClick={onDisconnect}
					className={cowatchButton + ' ' + cowatchButtonError}
					>
					<Icon icon={SVGIcon.PhoneDisconnect} size={24} />
					Disconnect
				</button>
				<button
					onClick={onSettings}
					className={cowatchButtonRound + ' ' + cowatchFlexPushRight}
					>
					<Icon icon={SVGIcon.Cog} size={24} />
				</button>
			</section>
		</section>
	);
}

function CowatchContentOptions() {
	return (
		<section className={cowatchContentConnected}>
			<ul className={cowatchContentJoinlistContainer} >
			</ul>

			<section className={cowatchContentConnectedButtons}>
				<button
					onClick={() => null}
					className={cowatchButton + ' ' + cowatchButtonSuccess}
					>
					<Icon icon={SVGIcon.CheckMark} size={24} />
					Save
				</button>
				<button
					onClick={() => null}
					className={cowatchButton + ' ' + cowatchButtonError}
					>
					<Icon icon={SVGIcon.XMark} size={24} />
					Exit
				</button>
			</section>
		</section>
	);
}

function Icon({ icon, size }: IconProps) {
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
