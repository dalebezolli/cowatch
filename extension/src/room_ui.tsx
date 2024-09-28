import { useEffect, useState, Fragment, useRef, useCallback, KeyboardEventHandler } from 'react';
import { createRoot } from 'react-dom/client';

import './room_ui.css';

import { LogLevel, log } from './log';
import { onCoreAction, triggerClientMessage } from './events';
import { Room, Client, ConnectionError, Status, RoomUISystemStatus, RoomUIRoomDetails, ServerStatus, ConnectionStatus } from './types';
import { sleep } from './utils';
import { transcode } from 'buffer';

const FAILED_INITIALIZATION_TOTAL_ATTEMPTS = parseInt(process.env.TOTAL_ATTEMPTS);
const FAILED_INITIALIZATION_REATEMPT_MS = parseInt(process.env.REATTEMPT_TIME);

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
		triggerClientMessage('ModuleStatus', { system: 'RoomUI', status: Status.ERROR });
		return;
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

enum CowatchStatus {
	Home,
	HostOptions,
	JoinOptions,
	Loading,
	Connected,
	Options,
	NotPrimaryTab,
	Disconnected,
};

function Cowatch() {
	const [hidden, setHidden] = useState(true);
	const [open, setOpen] = useState(true);
	const [errors, setErrors] = useState<string[]>([]);
	const [hostError, setHostError] = useState<string>();
	const [contentStatus, setContentStatus] = useState<CowatchStatus>(CowatchStatus.Home);
	const [pingDetails, setPingDetails] = useState<ConnectionStatus>({ connection: 'connecting', latestPing: 0, averagePing: 0 });
	const [roomStartDate, setRoomStartDate] = useState<Date>(new Date());
	const [roomState, setRoomState] = useState<Room>({
		roomID: '',
		host: null,
		viewers: [],
		settings: { name: '' },
	});

	const [clientState, setClientState] = useState<Client>({ name: '', image: '', publicToken: '' });

	useEffect(() => {
		onCoreAction('SendRoomUIClient', handleSendClient);
		onCoreAction('SendRoomUIPingDetails', handleConnectionStatus);
		onCoreAction('SendRoomUISystemStatus', handleSendSystemStatus);
		onCoreAction('SendRoomUIUpdateRoom', handleUpdateRoom);
		onCoreAction('SendError', handleConnectionError);

		triggerClientMessage('ModuleStatus', { system: 'RoomUI', status: Status.OK });
		triggerClientMessage('GetState', {});
	}, []);

	function handleUpdateRoom(roomDetails: RoomUIRoomDetails) {
		if(roomDetails.status === 'innactive' || roomDetails.status === 'disconnected') {
			setContentStatus(CowatchStatus.Home);
			return;
		}

		setContentStatus(CowatchStatus.Connected);
		setRoomState(roomDetails.room);
	}

	function handleConnectionError(connectionError: ConnectionError) {
		log(LogLevel.Info, 'Manage ui error:', connectionError)();
		if(connectionError.resolutionStrategy === 'displayOnInput' && connectionError.actionType === 'HostRoom') {
			setHostError(connectionError.error);
			return;
		}

		setErrors(prevError => {
			if(connectionError.error === prevError[prevError.length - 1]) {
				return prevError;
			}

			return [...prevError, connectionError.error]
		});

		if(connectionError.resolutionStrategy === 'returnToInitial') {
			setContentStatus(CowatchStatus.Home);
		}

		if(connectionError.resolutionStrategy === 'stayOnCurrentView') {
			switch(connectionError.actionType) {
				case 'HostRoom':
					setContentStatus(CowatchStatus.Home);
					break;
				case 'JoinRoom':
					setContentStatus(CowatchStatus.JoinOptions);
					break;
				case 'UpdateRoom':
					setContentStatus(CowatchStatus.Connected);
					break;
				case 'DisconnectRoom':
					setContentStatus(CowatchStatus.Home);
					break;
				case 'ReflectRoom':
					setContentStatus(CowatchStatus.Connected);
					break;
			}
		}
	}

	function handleError(error: string) {
		setErrors(prevError => [...prevError, error]);
	}

	function handleSendClient(client: Client) {
		if(client.publicToken === '') return;
		log(LogLevel.Info, 'Update client with:', client)();
		
		setClientState(client);
	}

	function handleConnectionStatus(status: ConnectionStatus) {
		setPingDetails(status);
	}


	function handleSendSystemStatus(status: RoomUISystemStatus) {
		log(LogLevel.Info, 'Managing system status:', status)();
		let ok = true;

		ok &&= status.RoomUI == Status.OK;
		ok &&= status.Connection == Status.OK;
		ok &&= status.ClientCollector == Status.OK;
		ok &&= status.PlayerInterceptor == Status.OK;
		if(!ok) {
			log(LogLevel.Error, 'Failed to initialize components', status)();
			handleError('Internal System Error.');
			return;
		}
		log(LogLevel.Info, 'Modules injected...')();

		setHidden(false);
		ok &&= status.isPrimaryTab;
		if(!ok) {
			setContentStatus(CowatchStatus.NotPrimaryTab);
			return;
		}
		log(LogLevel.Info, 'Tab is primary...')();

		ok &&= status.serverStatus == 'connected';
		ok &&= status.clientStatus == 'disconnected' || status.clientStatus == 'innactive';
		if(!ok) {
			log(LogLevel.Error, 'Client not connected yet', status)();
			setContentStatus(CowatchStatus.Disconnected);
			return;
		}
		log(LogLevel.Info, 'Client established connection with server')();

		log(LogLevel.Info, 'Client connected and ready. Displaying UI...', status)();
		setContentStatus(CowatchStatus.Home);
	}

	function onCloseError() {
		setErrors(prevError => prevError.slice(0,prevError.length - 1));
	}

	const toggleClose = () => setOpen(!open);

	let content: JSX.Element;
	if(hidden) {
		content = <Fragment></Fragment>;
	} else if(!open) {
		content = (
		<div className='px-[4px]'>
			<Button text='Show Room' style={ButtonStyle.transparentBorder} onClick={toggleClose} />;
		</div>
	);
	} else {
		content = (
			<section id='cowatch-root' className='
				relative box-content bg-neutral-900
				border border-neutral-600 rounded-[8px]
				font-sans text-neutral-100
				overflow-clip
			'>
				<CowatchHeader isConnected={contentStatus === CowatchStatus.Connected} roomTitle={roomState.settings.name} roomStartDate={roomStartDate} onPressClose={toggleClose} />
				<CowatchContent room={roomState} client={clientState} status={contentStatus} pingDetails={pingDetails} onChangeStatus={setContentStatus} hostError={hostError} />
			</section>
		);
	}

	return content;
}

export type CowatchHeaderProps = {
	isConnected: boolean,
	roomTitle?: string,
	roomStartDate?: Date,
	onPressClose: () => void,
}

function CowatchHeader({ isConnected, roomTitle, roomStartDate, onPressClose }: CowatchHeaderProps) {
	let [currentDate, setCurrentDate] = useState(new Date());
	let scrollInterval = useRef<number>();
	let titleContainerRef = useCallback((node: HTMLDivElement) => {
		clearInterval(scrollInterval.current);
		if(node == null) return;

		(node.children[0] as HTMLParagraphElement).style.setProperty('--pos', '0px');
		while(node.children.length > 1) {
			node.lastChild.remove();
		}

		let isOverflowing = node.scrollWidth > node.clientWidth;
		if(isOverflowing) {
			const TITLE_SEPARATOR = 16;
			if(node.children.length === 1) {
				let secondNode = node.children[0].cloneNode() as HTMLParagraphElement;
				secondNode.style.setProperty('--pos', TITLE_SEPARATOR + 'px');
				secondNode.textContent = node.children[0].textContent;
				node.appendChild(secondNode);
			}

			scrollInterval.current = window.setInterval(() => {
				for(let i = 0; i < node.children.length; i++) {
					const child = node.children[i] as HTMLParagraphElement;

					let currPos = parseInt(child.style.getPropertyValue('--pos').replace('px', ''));
					if(i == 0 && currPos === -1 * child.scrollWidth) {
						currPos = child.scrollWidth + TITLE_SEPARATOR * 2;
					}

					if(i == 1 && currPos === -1 * child.scrollWidth * 2 - TITLE_SEPARATOR) {
						currPos = 0 + TITLE_SEPARATOR;
					}

					child.style.setProperty('--pos', (currPos - 1) + 'px');
				}
			}, 30);
		} else {
			clearInterval(scrollInterval.current);
			scrollInterval == undefined;
		}
	}, [roomTitle]);

	useEffect(() => {
		const timerInterval = setInterval(() => setCurrentDate(new Date()), 1000);

		() => clearInterval(timerInterval);
	}, []);

	let timeDifference = Math.abs(currentDate.getTime() - roomStartDate.getTime());
	let seconds = Math.floor(timeDifference / 1000);
	let minutes = Math.floor(seconds / 60);
	let hours = Math.floor(minutes / 60);

	let displaySeconds = ((seconds % 60) < 10 ? '0' : '') + seconds % 60;
	let displayMinutes = ((minutes % 60) < 10 ? '0' : '') + minutes % 60;
	let displayHours   = (hours < 10 ? '0' : '') + hours;

	const moduleTitle = isConnected ? 'cw' : 'cowatch';
	const roomTitleElements = isConnected && roomTitle && (
		<Fragment>
			<div className='w-[1px] h-[18px] bg-neutral-200'></div>
			<div ref={titleContainerRef} className='overflow-hidden text-nowrap flex'>
				<p className='text-[1.4rem] text-neutral-500' style={{transform : 'translateX(var(--pos))'}} >{roomTitle}</p>
			</div>
		</Fragment>
	);
	const roomTimeElements = isConnected && roomStartDate && (
		<Fragment>
			<p className='text-[1.4rem] text-neutral-500'>
				{displayHours}:{displayMinutes}:{displaySeconds}
			</p>
		</Fragment>
	);

	return (
		<header className='
			relative z-10
			pt-[0.8rem] pr-[0.8rem] pb-[2.4rem] pl-[2.4rem]

			flex items-center gap-[16px]
			bg-neutral-900
		'>
			<p className='text-[1.6rem] text-neutral-100'>{moduleTitle}</p>
			{roomTitleElements}
			<div className='ml-auto flex items-center gap-[8px]'>
				{roomTimeElements}
				<Button icon={SVGIcon.XMark} style={ButtonStyle.transparent} onClick={onPressClose} />
			</div>
		</header>
	);
}

// function CowatchError({ error, onClose }: CowatchErrorProps) {
// 	if(!error) return;
//
// 	return (
// 		<div className={cowatchError} onClick={onClose}>
// 			<Icon icon={SVGIcon.Error} size={18} />
// 			<p>{error}</p>
// 		</div>
// 	);
// }

export type CowatchContentProps = {
	room: Room,
	client: Client,
	status: CowatchStatus,
	hostError: string,
	pingDetails: ConnectionStatus, 
	onChangeStatus: (status: CowatchStatus) => void,
};

function CowatchContent({ room, client, status, hostError, pingDetails, onChangeStatus }: CowatchContentProps) {
	let selectedContent: React.ReactElement;

	function onRequestDisconnect() {
		onChangeStatus(CowatchStatus.Loading);
		triggerClientMessage('DisconnectRoom', {});
	}

	function onSettings() {
		onChangeStatus(CowatchStatus.Options);
	}

	switch(status) {
		case CowatchStatus.Home:
			selectedContent = <CowatchContentHome
				client={client}
				onHost={() => onChangeStatus(CowatchStatus.HostOptions)}
				onJoin={() => onChangeStatus(CowatchStatus.JoinOptions)}
			/>;
			break;
		case CowatchStatus.HostOptions:
			selectedContent = <CowatchContentHostOptions
				client={client}
				hostError={hostError}
				onHost={(name) => triggerClientMessage('HostRoom', { name })}
				onBack={() => onChangeStatus(CowatchStatus.Home)}
			/>;
			break;
		case CowatchStatus.JoinOptions:
			selectedContent = <CowatchContentJoinOptions
				client={client}
				onJoin={(roomID) => {
					onChangeStatus(CowatchStatus.Loading);
					triggerClientMessage('JoinRoom', { roomID });
				}}
				onBack={() => onChangeStatus(CowatchStatus.Home)}
			/>;
			break;
		case CowatchStatus.Options:
			selectedContent = <div></div>;
			// selectedContent = <CowatchContentOptions />;
			break;
		case CowatchStatus.Connected:
			selectedContent = <CowatchContentConnected client={client} room={room} pingDetails={pingDetails} onDisconnect={onRequestDisconnect} onSettings={onSettings} />;
			break;
		case CowatchStatus.NotPrimaryTab:
			selectedContent = <CowatchContentSwitchTab
				onSwitchActiveTab={() => triggerClientMessage('SwitchActiveTab', {})}
			/>
			break;
		case CowatchStatus.Disconnected:
			selectedContent = (
				<section className='box-border h-full py-[64px] flex gap-[24px] flex-col justify-start items-center'>
					<p className='text-[1.6rem]'>Connecting to server</p>
				</section>
			);
			break;
		case CowatchStatus.Loading:
			selectedContent = (
				<section className='box-border h-full py-[64px] flex gap-[24px] flex-col justify-start items-center'>
					<p className='text-[1.6rem]'>Loading...</p>
				</section>
			)
			break;
	}

	return (
		<div className='h-[340px]'>
			{selectedContent}
		</div>
	);
}

export type CowatchContentInitialProps = {
	client: Client,
	onHost: () => void,
	onJoin: () => void,
};

function CowatchContentHome({ client, onHost, onJoin }: CowatchContentInitialProps) {
	return (
		<section className='box-border h-full py-[64px] flex gap-[24px] flex-col justify-start items-center'>
			<div className='flex gap-[8px] items-center'>
				<ImageDisplay iconUrl={client.image} size='32px' />
				<p className='text-[1.6rem]'>Start by hosting or joining a room</p>
			</div>

			<section className='flex gap-[16px] items-center'>
				<Button text='Host' icon={SVGIcon.Group} style={ButtonStyle.default} onClick={onHost} />
				<Button text='Join' icon={SVGIcon.Eye} style={ButtonStyle.default} onClick={onJoin} />
			</section>
		</section>
	);
}

type CowatchContentSwitchTabProps = {
	onSwitchActiveTab: () => void
};

function CowatchContentSwitchTab({ onSwitchActiveTab }: CowatchContentSwitchTabProps) {
	return (
		<section className='box-border h-full py-[64px] flex gap-[24px] flex-col justify-start items-center'>
			<p className='text-[1.6rem]'>Another cowatch is active, switch to this one?</p>

			<Button text='Switch' style={ButtonStyle.default} onClick={onSwitchActiveTab} />
		</section>
	)
}

type CowatchContentHostOptionsProps = {
	client: Client,
	hostError: string,
	onHost: (roomName: string) => void,
	onBack: () => void,
}

function CowatchContentHostOptions({ client, hostError, onHost, onBack }: CowatchContentHostOptionsProps) {
	const [error, setError] = useState<string>('');

	function onAttemptHost(input: string) {
		if(input.trim().length < 3) {
			setError('The room name must be 3 characters or more.');
			return;
		}

		if(input.trim().length > 50) {
			setError('The room name must be 50 characters or less.');
			return;
		}

		setError('');
		onHost(input.trim());
	}

	return (
		<section className='box-border h-full pt-[64px] pb-[16px] flex gap-[24px] flex-col justify-start items-center'>
			<div className='flex gap-[8px] items-center'>
				<ImageDisplay iconUrl={client.image} size='32px' />
				<p className='text-[1.6rem]'>Tell me the name of your room</p>
			</div>

			<Input placeholder='Really cool study session' error={hostError || error} onButtonClick={onAttemptHost} onConfirm={onAttemptHost} withButton={true} buttonText='Host' icon={SVGIcon.Group} />

			<div className='w-full mt-auto px-[0.8rem] flex justify-end'>
				<Button text='Go Back' style={ButtonStyle.transparent} onClick={onBack} />
			</div>
		</section>
	);
}

type CowatchContentJoinOptionsProps = {
	client: Client,
	onJoin: (roomID: string) => void,
	onBack: () => void,
};

function CowatchContentJoinOptions({ client, onJoin, onBack }: CowatchContentJoinOptionsProps) {
	return (
		<section className='box-border h-full pt-[64px] pb-[16px] flex gap-[24px] flex-col justify-start items-center'>
			<div className='flex gap-[8px] items-center'>
				<ImageDisplay iconUrl={client.image} size='32px' />
				<p className='text-[1.6rem]'>Type room's ID</p>
			</div>

			<Input placeholder='3o0bZ' onButtonClick={onJoin} onConfirm={onJoin} withButton={true} buttonText='Join' icon={SVGIcon.Eye} />

			<div className='w-full mt-auto px-[0.8rem] flex justify-end'>
				<Button text='Go Back' style={ButtonStyle.transparent} onClick={onBack} />
			</div>
		</section>
	);
}

type CowatchContentConnectedProps = {
	client: Client,
	room: Room,
	pingDetails: ConnectionStatus,
	onDisconnect: () => void,
	onSettings: () => void,
};

function CowatchContentConnected({ client, room, pingDetails, onDisconnect, onSettings }: CowatchContentConnectedProps) {
	return (
		<section className='h-full flex flex-col'>
			<ul className='w-full grow overflow-y-scroll'>
				{
					room.host ? (
						<ConnectedClientListItem client={room.host} isHost={true} isConnected={true} />
					) : null
				}

				{
					room.viewers.length ? room.viewers.map(client => (
						<ConnectedClientListItem client={client} isHost={false} isConnected={true} />
					)) : null
				}
			</ul>

			<ConnectedActionHUD
				client={client} room={room}
				connectionStatus={{ status: pingDetails.connection, avgPing: pingDetails.averagePing, latestPing: pingDetails.latestPing }}
				onDisconnect={onDisconnect}
			/>
		</section>
	);
}

type ConnectedClientListItemProps = {
	client: Client,
	isHost: boolean,
	isConnected: boolean,
};

function ConnectedClientListItem({ client, isHost, isConnected }: ConnectedClientListItemProps) {
	return (
		<li key={client.name} className={`flex items-center gap-[16px] px-[24px] py-[4px] text-[1.4rem] ${ isConnected ? '' : 'opacity-60'}`}>
			<ImageDisplay iconUrl={client.image} size='24px' />
			{client.name}
			{ isHost && <Icon icon={SVGIcon.Connected} size={16} strokeColor='stroke-green-300' /> }
		</li>
	);
}

type ConnectedActionHUDProps = {
	client: Client,
	room: Room,
	connectionStatus: { status: ServerStatus, avgPing: number, latestPing: number },
	onDisconnect: () => void,
};

function ConnectedActionHUD({client, room, connectionStatus, onDisconnect}: ConnectedActionHUDProps) {
	const refCopy = useRef<HTMLSpanElement>();
	async function copyRoomID() {
		try {
			await navigator.clipboard.write([
				new ClipboardItem({ 'text/plain': room.roomID })
			]);
			if(refCopy.current !== null) {
				refCopy.current.lastChild.textContent = 'Copied!';
				refCopy.current.setAttribute('data-copied', 'true');
			}
		} catch(err) {
			log(LogLevel.Error, 'Failed to copy to clipboard:', err)();
				refCopy.current.setAttribute('data-copied', 'false');
		}
	}

	function resetCopyButton() {
		if(refCopy.current !== null) {
			refCopy.current.lastChild.textContent = 'Copy';
			refCopy.current.setAttribute('data-copied', 'false');
		}
	}

	let userIconColor = '#14EF63';
	let avgPingColor = 'text-green-400';
	let latestPingColor = 'text-green-400';
	let statusMessage = 'Connected';

	if(connectionStatus.status == 'failed' || connectionStatus.avgPing >= 350) {
		statusMessage = 'Disconnected';
		userIconColor = '#F21818';
		avgPingColor = 'text-red-400';
	} else if(connectionStatus.avgPing >= 200) {
		userIconColor = '#FACC15';
		avgPingColor = 'text-yello-400';
	}

	if(connectionStatus.latestPing >= 350) {
		latestPingColor = 'text-red-400';
	} else if(connectionStatus.latestPing >= 200) {
		latestPingColor = 'text-yellow-400';
	}

	return (
		<section className='pr-[8px] py-[12px] pl-[24px] flex bg-neutral-800'>
			<section className='flex items-center gap-[16px]'>
				<div className='group relative'>
					<ImageDisplay iconUrl={client.image} size='34px' style={{
						boxShadow: `0 0 0 2px #262626, 0 0 0 5px ${userIconColor}`
					}} />
					<div className='absolute pl-[32px] z-10 bottom-[-4px] left-[12px] invisible group-hover:visible'>
						<div className='px-[14px] py-[12px] w-max bg-neutral-700 rounded-[4px]'>
							<p className='text-[1.4rem] font-bold text-neutral-100 pb-[8px]'>{statusMessage}</p>
							<p className='text-[1.4rem] text-neutral-400'>
								Latest Ping:&nbsp;
								<span className={`text-[1.4rem] ${latestPingColor}`}>
									{connectionStatus.status === 'connected' ? connectionStatus.latestPing + 'ms' : '---'}
								</span>
							</p>
							<p className='text-[1.4rem] text-neutral-400'>
								Average Ping:&nbsp;
								<span className={`text-[1.4rem] ${avgPingColor}`}>
									{connectionStatus.status === 'connected' ? connectionStatus.avgPing + 'ms' : '---'}
								</span>
							</p>
						</div>
					</div>
				</div>

				<div className='flex flex-col gap-[2px]'>
					<p className='text-[1.6rem] bold'>{client.name}</p>

					<button className='
						relative pt-[2px]

						flex gap-[2px]
						text-neutral-500 hover:text-neutral-200 text-[1.4rem]
						border-none cursor-pointer

						transition-all
						
						group'
						onClick={copyRoomID}
						onMouseOut={resetCopyButton}
					>
						<Icon icon={SVGIcon.Group} size={16} strokeColor='stroke-neutral-500 group-hover:stroke-neutral-200' className='transition-colors' />
						{room.roomID}
						<span
							ref={refCopy}
							data-copied='false'
							className='
							ml-[6px] -translate-y-[15%]
							px-[8px] py-[2px]
							flex gap-[2px] items-center
							bg-green-300
							text-neutral-800 rounded-[4px]

							data-[copied="true"]:animate-bounce transition-colors

							invisible group-hover:visible
						'>
							<Icon icon={SVGIcon.Copy} size={12} strokeColor='stroke-neutral-800' fillColor='fill-neutral-800' /><span>Copy</span>
						</span>
					</button>
				</div>
			</section>


			<div className='w-full flex items-center justify-end'>
				<Button icon={SVGIcon.PhoneDisconnect} style={ButtonStyle.transparent} onClick={onDisconnect} />
				<Button icon={SVGIcon.Cog} style={ButtonStyle.transparent} />
			</div>
		</section>
	);
}

type ImageDisplayProps = {
	iconUrl: string,
	size: string,
	style?: React.CSSProperties,
};

function ImageDisplay({ iconUrl, size, style }: ImageDisplayProps) {
	return (
		<div className='rounded-full relative' style={{ width: size, height: size, ...style }}>
			<img className='rounded-full z-10 absolute top-0 left-0' style={{ width: size, height: size }} src={iconUrl} />
			<div className='rounded-full bg-neutral-600 animate-pulse absolute top-0 left-0' style={{ width: size, height: size }}></div>
		</div>
	)
}

// function CowatchContentOptions() {
// 	return (
// 		<section className={cowatchContentConnected}>
// 			<ul className={cowatchContentJoinlistContainer} >
// 			</ul>
//
// 			<section>
// 				<button
// 					onClick={() => null}
// 					className={cowatchButton + ' ' + cowatchButtonSuccess}
// 					>
// 					<Icon icon={SVGIcon.CheckMark} size={24} />
// 					Save
// 				</button>
// 				<button
// 					onClick={() => null}
// 					className={cowatchButton + ' ' + cowatchButtonError}
// 					>
// 					<Icon icon={SVGIcon.XMark} size={24} />
// 					Exit
// 				</button>
// 			</section>
// 		</section>
// 	);
// }

enum ButtonStyle {
	default,
	success,
	error,
	transparent,
	transparentBorder,
}

enum ButtonBorderRounding {
	roundAll,
	roundNone,
	roundLeft,
	roundRight,
}

type ButtonProps = {
	text?: string,
	icon?: SVGIcon,
	iconPosition?: 'left' | 'right',

	style: ButtonStyle,
	borderRounding?: ButtonBorderRounding,

	onClick?: () => void
	loadAfterClick?: boolean,
};

function Button({ text, icon, style, borderRounding, iconPosition, loadAfterClick, onClick }: ButtonProps) {
	const [loading, setLoading] = useState<boolean>(false);

	function onClickHandler() {
		if(loadAfterClick) setLoading(true);
		onClick();
	}

	let className = '';
	if(text == null) {
		className += ' min-h-[40px] min-w-[40px] h-[40px] w-[40px]';
	} else {
		className += ' min-h-[38px] px-[1.6rem]';
	}

	if(borderRounding == null) borderRounding = ButtonBorderRounding.roundAll;
	switch(borderRounding) {
		case ButtonBorderRounding.roundAll:
			className += ' rounded-full';
			break;
		case ButtonBorderRounding.roundLeft:
			className += ' rounded-l-full';
			break;
		case ButtonBorderRounding.roundRight:
			className += ' rounded-r-full';
			break;
	}

	if(loading) icon = SVGIcon.Loading;

	let fillColor = 'fill-neutral-200';
	let strokeColor = 'stroke-neutral-200';
	switch(style) {
		case ButtonStyle.transparent:
			className += ' bg-transparent hover:bg-neutral-700 focus:bg-neutral-600 text-neutral-200 border-transparent';
			break;
		case ButtonStyle.transparentBorder:
			className += ' bg-transparent hover:bg-neutral-700 focus:bg-neutral-600 text-neutral-200 border-neutral-600';
			break;
		case ButtonStyle.default:
			className += ' bg-neutral-700 hover:bg-neutral-600 focus:bg-neutral-500 text-neutral-200 border-transparent';
			break;
		case ButtonStyle.success:
			className += ' bg-green-800 hover:bg-green-600 focus:bg-green-500 text-neutral-200 border-transparent';
			break;
		case ButtonStyle.error:
			className += ' bg-red-800 hover:bg-red-700 focus:bg-red-600 text-neutral-200 border-transparent';
			break;
	}

	const displayedIcon = <Icon icon={icon} size={24} fillColor={fillColor} strokeColor={strokeColor} className={loading ? 'animate-spin' : ''} />;
	return (
		<button
			className={`
				flex gap-1.5 items-center justify-center border font-sans cursor-pointer
				${ style === ButtonStyle.transparentBorder ? 'w-full' : 'w-fit'}
				${className}
			`}
			onClick={onClickHandler}
		>
			{ icon && (iconPosition == null || iconPosition === 'left') && displayedIcon }
			{ text && <p className='font-bold text-[1.4rem]'>{ text }</p> }
			{ icon && iconPosition === 'right' && displayedIcon }
		</button>
	)
}


type InputProps = {
	placeholder?: string,
	input?: string,
	withButton?: boolean,
	buttonText?: string,
	icon?: SVGIcon,
	error?: string,
	onButtonClick?: (input: string) => void,
	onConfirm?: (input: string) => void,
};


function Input({input, placeholder, withButton, buttonText, icon, error, onButtonClick, onConfirm}: InputProps) {
	const inputRef = useRef<HTMLInputElement>();

	function onHandleCheckConfirm(event: React.KeyboardEvent<HTMLInputElement>) {
		if(event.key !== 'Enter') return;
		if(onConfirm) onConfirm(inputRef.current.value);
	}

	return (
		<div>
			<section className='flex items-center rounded-full h-[38px]'>
				<input
					id='input-room-code'
					placeholder={placeholder}
					className={`
						box-border h-full min-w-[180px] px-[16px]
						flex-grow

						text-[1.4rem] placeholder:text-[1.4rem]
						border rounded-l-full ${!withButton ? 'rounded-r-full' : ''}
						${ !error ?
							'bg-transparent text-neutral-100 placeholder:text-neutral-500 border-neutral-700' :
							'bg-red-950 text-red-500 border border-red-800 placeholder:text-red-700'
						}
					`}
					ref={inputRef}
					defaultValue={input}
					onKeyUp={onHandleCheckConfirm}
				/>

				{ withButton && (
					<Button
						text={buttonText}
						style={!error ? ButtonStyle.default : ButtonStyle.error}
						borderRounding={ButtonBorderRounding.roundRight}
						onClick={() => { onButtonClick(inputRef.current.value) }}

						iconPosition='left'
						icon={icon}
					/>
				)}
			</section>
			{ error && (
				<div className='flex items-center gap-[2px] py-[6px]'>
					<Icon icon={SVGIcon.XMark} size={16} className='aspect-square w-[16px] stroke-red-500' />
					<p className='text-[1.4rem] text-red-500'>{error}</p>
				</div>
			)}
		</div>
	);
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
	Loading,
	Copy,
	Connected,
};

type IconProps = {
	icon: SVGIcon,
	size?: number,
	fillColor?: string,
	strokeColor?: string,
	className?: string,
};

function Icon({ icon, size, fillColor, strokeColor, className }: IconProps) {
	let domIcon: React.ReactElement;

	switch(icon) {
		case SVGIcon.XMark:
			domIcon = (
				<svg className={className} width={size} height={size} viewBox='0 0 24 24' fill='none'>
					<path d='M6.7583 17.2426L12.0009 12M12.0009 12L17.2435 6.75735M12.0009 12L6.7583 6.75735M12.0009 12L17.2435 17.2426' className={strokeColor} fill='none' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
				</svg>
			);
			break;
		case SVGIcon.CheckMark: // TODO: Icon not working, fix later
			domIcon = (
				<svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
					<path d="M1 13.6L7.28571 20L23 4" className={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			);
			break;
		case SVGIcon.Group:
			domIcon = (
				<svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
					<path d="M1 20V19C1 15.134 4.13401 12 8 12C11.866 12 15 15.134 15 19V20" className={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
					<path d="M13 14C13 11.2386 15.2386 9 18 9C20.7614 9 23 11.2386 23 14V14.5" className={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
					<path d="M8 12C10.2091 12 12 10.2091 12 8C12 5.79086 10.2091 4 8 4C5.79086 4 4 5.79086 4 8C4 10.2091 5.79086 12 8 12Z" className={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
					<path d="M18 9C19.6569 9 21 7.65685 21 6C21 4.34315 19.6569 3 18 3C16.3431 3 15 4.34315 15 6C15 7.65685 16.3431 9 18 9Z" className={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			);
			break;
		case SVGIcon.Eye:
			domIcon = (
				<svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
					<path d="M3 13C6.6 5 17.4 5 21 13" fill="none" strokeWidth="1.5" className={strokeColor} strokeLinecap="round" strokeLinejoin="round" />
					<path d="M12 17C10.3431 17 9 15.6569 9 14C9 12.3431 10.3431 11 12 11C13.6569 11 15 12.3431 15 14C15 15.6569 13.6569 17 12 17Z" className={fillColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			);
			break;
		case SVGIcon.ArrowLeft:
			domIcon = (
				<svg className={className + ' ' + strokeColor} width={size} height={size} viewBox="0 0 24 24" fill="none">
					<path d="M23 12H1M1 12L11.3889 2M1 12L11.3889 22" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			);
			break;
		case SVGIcon.PhoneDisconnect:
			domIcon = (
				<svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
					<path d="M8.77964 8.5L9.26995 5.8699L7.81452 2H4.0636C2.93605 2 2.04804 2.93086 2.2164 4.04576C2.50361 5.94771 3.17338 8.90701 4.72526 11.7468M10.9413 13.5C11.778 14.244 12.7881 14.8917 14 15.5L18.1182 14.702L22 16.1812V19.7655C22 20.9575 20.9679 21.8664 19.8031 21.613C16.9734 20.9974 11.9738 19.506 8.22388 16.1812" className={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
					<path d="M21 3L3 21" className={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			);
			break;
		case SVGIcon.Cog:
			domIcon = (
				<svg className={className + ' ' + strokeColor} width={size} height={size} viewBox="0 0 24 24" fill="none">
					<path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" className="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
					<path d="M19.6224 10.3954L18.5247 7.7448L20 6L18 4L16.2647 5.48295L13.5578 4.36974L12.9353 2H10.981L10.3491 4.40113L7.70441 5.51596L6 4L4 6L5.45337 7.78885L4.3725 10.4463L2 11V13L4.40111 13.6555L5.51575 16.2997L4 18L6 20L7.79116 18.5403L10.397 19.6123L11 22H13L13.6045 19.6132L16.2551 18.5155C16.6969 18.8313 18 20 18 20L20 18L18.5159 16.2494L19.6139 13.598L21.9999 12.9772L22 11L19.6224 10.3954Z" className="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			);
			break;
		case SVGIcon.Broadcast:
			domIcon = (
				<svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
					<path d="M17.5 8C17.5 8 19 9.5 19 12C19 14.5 17.5 16 17.5 16" className={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
					<path d="M20.5 5C20.5 5 23 7.5 23 12C23 16.5 20.5 19 20.5 19" className={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
					<path d="M6.5 8C6.5 8 5 9.5 5 12C5 14.5 6.5 16 6.5 16" className={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
					<path d="M3.5 5C3.5 5 1 7.5 1 12C1 16.5 3.5 19 3.5 19" className={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
					<path d="M12 13C12.5523 13 13 12.5523 13 12C13 11.4477 12.5523 11 12 11C11.4477 11 11 11.4477 11 12C11 12.5523 11.4477 13 12 13Z" className={fillColor + ' ' + strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			);
			break;
		case SVGIcon.Mute:
			domIcon = (
				<svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
					<path d="M18 14L20.0005 12M20.0005 12L22 10M20.0005 12L18 10M20.0005 12L22 14" className={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
					<path d="M2 13.8571V10.1429C2 9.03829 2.89543 8.14286 4 8.14286H6.9C7.09569 8.14286 7.28708 8.08544 7.45046 7.97772L13.4495 4.02228C14.1144 3.5839 15 4.06075 15 4.85714V19.1429C15 19.9392 14.1144 20.4161 13.4495 19.9777L7.45046 16.0223C7.28708 15.9146 7.09569 15.8571 6.9 15.8571H4C2.89543 15.8571 2 14.9617 2 13.8571Z" className={strokeColor} strokeWidth="1.5" />
				</svg>
			);
			break;
		case SVGIcon.Kebab:
			domIcon = (
				<svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
					<path d="M12 5H12.0001" className={strokeColor} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
					<path d="M12 12H12.0001" className={strokeColor} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
					<path d="M12 19H12.0001" className={strokeColor} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			);
			break;
		case SVGIcon.Error:
			domIcon = (
				<svg className={className + ' ' + strokeColor} width={size} height={size} viewBox="0 0 18 18" fill="none">
					<g clipPath="url(#clip0_149_598)">
						<path d="M9 5.25V9.75" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
						<path d="M9 12.7575L9.0075 12.7492" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
						<path d="M9 16.5C13.1421 16.5 16.5 13.1421 16.5 9C16.5 4.85786 13.1421 1.5 9 1.5C4.85786 1.5 1.5 4.85786 1.5 9C1.5 13.1421 4.85786 16.5 9 16.5Z" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
					</g>
					<defs>
						<clipPath id="clip0_149_598">
							<rect width="18" height="18" className="none" />
						</clipPath>
					</defs>
				</svg>
			);
			break;
		case SVGIcon.Loading:
			domIcon = (
				<svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
					<path d="M10.6992 3.25391C10.8945 3.91406 10.5195 4.61328 9.85938 4.80859C6.75781 5.73438 4.5 8.60547 4.5 12C4.5 16.1406 7.85938 19.5 12 19.5C16.1406 19.5 19.5 16.1406 19.5 12C19.5 8.60547 17.2422 5.73438 14.1445 4.80859C13.4844 4.61328 13.1055 3.91406 13.3047 3.25391C13.5039 2.59375 14.1992 2.21484 14.8594 2.41406C18.9883 3.64453 22 7.46875 22 12C22 17.5234 17.5234 22 12 22C6.47656 22 2 17.5234 2 12C2 7.46875 5.01172 3.64453 9.14453 2.41406C9.80469 2.21875 10.5039 2.59375 10.6992 3.25391Z" className={fillColor} />
				</svg>
			);
			break;
		case SVGIcon.Copy:
			domIcon = (
				<svg className={className} width={size} height={size} viewBox="0 0 24 24">
					<g className={strokeColor} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
						<path fill="none" d="M22.2 23H8.8a.8.8 0 0 1-.8-.8V8.8c0-.4.4-.8.8-.8h13.4c.4 0 .8.4.8.8v13.4c0 .4-.4.8-.8.8Z"/>
						<path fill="none" d="M16 7.8v-6c0-.4-.4-.8-.8-.8H1.8c-.4 0-.8.4-.8.8v13.4c0 .4.4.8.8.8h6"/>
					</g>
				</svg>
			);
			break;
		case SVGIcon.Connected:
			domIcon = (
				<svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
					<path d="M6.5 14C7.32845 14 8 13.3284 8 12.5C8 11.6716 7.32845 11 6.5 11C5.67155 11 5 11.6716 5 12.5C5 13.3284 5.67155 14 6.5 14Z" className={fillColor + ' ' + strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
					<path d="M11 7C11 7 13 9.0625 13 12.5C13 15.9375 11 18 11 18" className={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
					<path d="M17 2C17 2 20 5.75 20 12.5C20 19.25 17 23 17 23" className={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
				</svg>
			);
			break;
		default:
			domIcon = <div></div>
	}

	return domIcon;
}
