export enum LogLevel {
	Debug,
	Info,
	Warn,
	Error,
	None,
};

let global_level = LogLevel.Debug;

export function setLevel(new_level: LogLevel) {
	global_level = new_level;
}

export function getLevel() {
	return LogLevel[global_level];
}

export function log(level: LogLevel, ...message: Array<string>) {
	if(global_level > level || level === LogLevel.None) return;

	const now = new Date().toJSON().replace('T', ' ').slice(0, -1);

	let log = (level !== LogLevel.Debug) ? console[LogLevel[level].toLowerCase()] : console.log;

	const namespace = new Error().stack?.split('\n')[1]?.match(/\/[a-z_A-Z]+\.js/)?.toString()?.slice(1, -3) || '';

	if(namespace) {
		return log.bind(console, `[${now}]`, `[${namespace}]`, `[${LogLevel[level]}]`, ...message);
	} else {
		return log.bind(console, `[${now}]`, `[${LogLevel[level]}]`, ...message);
	}
}

