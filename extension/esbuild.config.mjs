import * as esbuild from 'esbuild';

const outpath = process.argv[2] ?? './dist/firefox/';

await esbuild.build({
	entryPoints: ['./src/client_manager.tsx'],
	bundle: true,
	outfile: outpath + 'client_manager.js',
	format: 'esm'
});

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
