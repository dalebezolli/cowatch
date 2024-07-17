import * as esbuild from 'esbuild';

const outpath = process.argv[2] ?? './dist/firefox/';

await esbuild.build({
	entryPoints: ['./src/core.ts'],
	bundle: true,
	outfile: outpath + '/core.js',
	format: 'esm'
});

await esbuild.build({
	entryPoints: ['./src/player_interceptor.ts'],
	bundle: true,
	outfile: outpath + 'player_interceptor.js',
	format: 'esm'
});

await esbuild.build({
	entryPoints: ['./src/room_ui.tsx'],
	bundle: true,
	outfile: outpath + 'room_ui.js',
	format: 'esm'
});

await esbuild.build({
	entryPoints: ['./src/user_collector.ts'],
	bundle: true,
	outfile: outpath + 'user_collector.js',
	format: 'esm'
});
