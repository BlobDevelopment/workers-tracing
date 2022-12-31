import { readFile } from 'fs/promises';
import { argv, exit } from 'process';
import esbuild from 'esbuild';
import { replace } from 'esbuild-plugin-replace';

const format = argv.length >= 3 ? argv[2] : 'esm';

const version = JSON.parse(await readFile('package.json'), { encoding: 'utf8' }).version;

async function build() {
	console.log(`Building Workers Tracing (in ${format} format) - Version: ${version}`);

	const result = await esbuild.build({
		entryPoints: ['src/index.ts'],
		format,
		platform: 'neutral',
		bundle: true,
		// minify: true,
		sourcemap: true,
		outfile: `dist/workers-tracing.${format === 'esm' ? 'mjs' : 'cjs'}`,
		plugins: [
			replace({
				'__VERSION__': `${version}`,
			}),
		],
	});

	if (result.errors.length > 0) {
		console.error(result.errors.map((msg) => `${msg.id} [${msg.pluginName}]: ${msg.text} - ${msg.detail}`).join('\n'));
		exit(1);
	} else if (result.warnings.length > 0) {
		console.warn(result.warnings.map((msg) => `${msg.id} [${msg.pluginName}]: ${msg.text} - ${msg.detail}`).join('\n'));
	} else {
		console.log('Built successfully!');
	}
}

build();
