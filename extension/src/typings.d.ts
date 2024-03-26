declare module '*.module.css';

type BasicUser = {
	username: string,
	user_image: string,
};

type ConnectedUser = {};

type BasicRoom = {

};

type ContentScriptActionType = 'EstablishConnection' | 'CreateRoom'
type ContentScriptActionBody = {
	'EstablishConnection': BasicUser,
	'CreateRoom': BasicRoom
};
