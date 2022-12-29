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
	logLevel?: "none" | "info" | "error" | "log" | "warn" | "debug";
	logPrefix?: string;
}

export function startWorker(script: string, opts?: DevOptions): Promise<UnstableDevWorker> {
	return unstable_dev(script, {
		bundle: true,
		port: 3000,
		local: true,
		...opts,
	});
}

export async function startCollector(): Promise<UnstableDevWorker> {
	const worker = await unstable_dev('test/scripts/collector.ts', {
		bundle: true,
		port: 4318,
		local: true,
		kv: [{
			binding: 'KV',
			id: 'collector',
		}],
	});

	return worker;
}
