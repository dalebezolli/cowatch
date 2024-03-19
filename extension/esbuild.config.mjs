import * as esbuild from 'esbuild';

await esbuild.build({
	entryPoints: ['./src/client_manager.tsx'],
	bundle: true,
	outfile: './dist/client_manager.js',
	format: 'esm'
});

await esbuild.build({
	entryPoints: ['./src/core.ts'],
	bundle: true,
	outfile: './dist/core.js',
	format: 'esm'
});
