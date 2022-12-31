import { UnstableDevWorker } from 'wrangler';
import { OtlpJson } from '../../src/transformers/otlp';

export async function getTrace<T = OtlpJson>(
	collectorWorker: UnstableDevWorker,
	traceId: string,
) {
	const collectorRes = await collectorWorker.fetch(`https://collector/__/lookup/${traceId}`);

	return collectorRes.json() as T;
}
