import { OtlpJsonTrace } from 'src/transformers/otlpjson';
import { UnstableDevWorker } from 'wrangler';

export async function getTrace<T = OtlpJsonTrace>(
	collectorWorker: UnstableDevWorker,
	traceId: string,
) {
	const collectorRes = await collectorWorker.fetch(`https://collector/__/lookup/${traceId}`);

	return collectorRes.json() as T;
}
