import { UnstableDevWorker, unstable_dev } from 'wrangler';

interface DevOptions {
	bundle?: boolean;
	compatibilityDate?: string;
	compatibilityFlags?: string[];
	persist?: boolean;
	persistTo?: string;
	vars?: {
			[key: string]: unknown;
	};
	kv?: {
			binding: string;
			id: string;
			preview_id?: string;
	}[];
	durableObjects?: {
			name: string;
			class_name: string;
			script_name?: string | undefined;
			environment?: string | undefined;
	}[];
	r2?: {
			binding: string;
			bucket_name: string;
			preview_bucket_name?: string;
	}[];
	d1Databases?: {
		binding: string;
		database_name: string;
		database_id: string;
		preview_database_id?: string;
		migrations_table?: string;
		migrations_dir?: string;
		database_internal_env?: string;
	}[];
	showInteractiveDevSession?: boolean;
	logLevel?: 'none' | 'info' | 'error' | 'log' | 'warn' | 'debug';
	logPrefix?: string;
}

// If there's errors in tests, worth changing this to "debug"
const LOG_LEVEL: 'none' | 'info' | 'error' | 'log' | 'warn' | 'debug' = 'error';

export async function startWorker(scriptPath: string, opts?: DevOptions): Promise<UnstableDevWorker> {
	if (LOG_LEVEL === 'debug') {
		console.log(`Starting ${scriptPath}`);
	}
	const worker = await unstable_dev(scriptPath, {
		bundle: true,
		local: true,
		logLevel: LOG_LEVEL,
		...opts,
	});

	if (LOG_LEVEL === 'debug') {
		console.log(`Started ${scriptPath} - address: ${worker.address}, port: ${worker.port}`);
	}

	return worker;
}

export async function startCollector(opts: DevOptions & { port: number }): Promise<UnstableDevWorker> {
	if (LOG_LEVEL === 'debug') {
		console.log('Starting collector');
	}
	const worker = await unstable_dev('test/scripts/collector.ts', {
		bundle: true,
		local: true,
		kv: [{
			binding: 'KV',
			id: 'collector',
		}],
		logLevel: LOG_LEVEL,
		...opts,
	});

	if (LOG_LEVEL === 'debug') {
		console.log(`Started collector - address: ${worker.address}, port: ${worker.port}`);
	}

	return worker;
}
