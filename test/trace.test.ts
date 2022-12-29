import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { UnstableDevWorker } from 'wrangler';
import { getTrace } from './utils/trace';
import { startCollector, startWorker } from './utils/worker';

let devWorker: UnstableDevWorker;
let collectorWorker: UnstableDevWorker;

describe('createTrace should work', () => {
	beforeAll(async () => {
		collectorWorker = await startCollector({ port: 4318 });
	});

	afterEach(async () => {
		if (devWorker) {
			await devWorker.stop();
			await devWorker.waitUntilExit();
		}
	});

	afterAll(async () => {
		if (collectorWorker) {
			await collectorWorker.stop();
			await collectorWorker.waitUntilExit();
		}
	});

	it('Should have a root span', async () => {
		devWorker = await startWorker('test/scripts/root-span.ts');

		const res = await devWorker.fetch('http://worker/test');

		expect(res.status).toBe(200);
		expect(res.headers.get('x-trace-id')).not.toBeNull();

		const traceId = res.headers.get('x-trace-id');
		const trace = await getTrace(collectorWorker, traceId!);

		expect(trace.resourceSpans.length).toBe(1);
		const resourceSpan = trace.resourceSpans[0];

		expect(resourceSpan.resource.attributes[0].key).toBe('service.name');
		expect(resourceSpan.resource.attributes[0].value).toStrictEqual({ stringValue: 'root-span' });

		expect(resourceSpan.scopeSpans.length).toBe(1);
		expect(resourceSpan.scopeSpans[0].scope.name).toBe('root-span');
		expect(resourceSpan.scopeSpans[0].spans.length).toBe(1);
		const span = resourceSpan.scopeSpans[0].spans[0];

		expect(span.name).toBe('Request (fetch event)');
	});
});
