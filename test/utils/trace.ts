import { expect } from 'vitest';
import { UnstableDevWorker } from 'wrangler';
import { OtlpJson } from '../../src/transformers/otlp';

export async function requestAndGetTrace<T = OtlpJson>(
	devWorker: UnstableDevWorker,
	collectorWorker: UnstableDevWorker,
	url: string,
): Promise<T> {
	const res = await devWorker.fetch(url);

	expect(res.status).toBe(200);
	expect(res.headers.get('x-trace-id')).not.toBeNull();

	const traceId = res.headers.get('x-trace-id');
	expect(traceId).not.toBeNull();

	// This is already expected above
	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	const trace = await getTrace<T>(collectorWorker, traceId!);

	return trace;
}

export async function getTrace<T = OtlpJson>(
	collectorWorker: UnstableDevWorker,
	traceId: string,
) {
	const collectorRes = await collectorWorker.fetch(`https://collector/__/lookup/${traceId}`);

	return collectorRes.json() as T;
}
