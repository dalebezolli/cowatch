import * as esbuild from 'esbuild';
import * as dotenv from 'dotenv';

const definitions = {};
dotenv.config({ processEnv: definitions });
formatProcessEnvNames(definitions);

const outpath = process.argv[2] ?? './dist/firefox/';

await esbuild.build({
	entryPoints: ['./src/background.ts'],
	bundle: true,
	outfile: outpath + '/background.js',
	define: definitions,
	format: 'esm'
});

await esbuild.build({
	entryPoints: ['./src/core.ts'],
	bundle: true,
	outfile: outpath + '/core.js',
	define: definitions,
	format: 'esm'
});

await esbuild.build({
	entryPoints: ['./src/player_interceptor.ts'],
	bundle: true,
	outfile: outpath + 'player_interceptor.js',
	define: definitions,
	format: 'esm'
});

await esbuild.build({
	entryPoints: ['./src/room_ui.tsx'],
	bundle: true,
	outfile: outpath + 'room_ui.js',
	define: definitions,
	format: 'esm'
});

await esbuild.build({
	entryPoints: ['./src/client_collector.ts'],
	bundle: true,
	outfile: outpath + 'client_collector.js',
	define: definitions,
	format: 'esm'
});

function formatProcessEnvNames(envObject) {
	for(const [key, value] of Object.entries(envObject)) {
		delete envObject[key];
		envObject[`process.env.${key}`] = `"${value}"`;
	}
}
