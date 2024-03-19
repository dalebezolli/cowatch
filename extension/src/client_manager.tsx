import * as React from 'react';
import * as Server from 'react-dom/server';
import { LogLevel, log } from './log';


function Greet() {
	log(LogLevel.Debug, 'Created greet component')();
	return <h1>Hello, world!</h1>
}
console.log(Server.renderToString(<Greet />));
