import { OtlpTransformer } from 'src/transformers/otlp';
import { UnstableDevWorker } from 'wrangler';

export async function getTrace<T = OtlpTransformer>(
	collectorWorker: UnstableDevWorker,
	traceId: string,
) {
	const collectorRes = await collectorWorker.fetch(`https://collector/__/lookup/${traceId}`);

	return collectorRes.json() as T;
}
