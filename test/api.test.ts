import { ATTRIBUTE_NAME } from 'src/utils/constants';
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';
import { UnstableDevWorker } from 'wrangler';
import { getTrace } from './utils/trace';
import { startCollector, startWorker } from './utils/worker';

let devWorker: UnstableDevWorker;
let collectorWorker: UnstableDevWorker;

describe('API', () => {
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

	describe('createTrace', () => {
		test('Default root span', async () => {
			devWorker = await startWorker('test/scripts/api/root-span.ts');

			const res = await devWorker.fetch('http://worker/test');

			expect(res.status).toBe(200);
			expect(res.headers.get('x-trace-id')).not.toBeNull();

			const traceId = res.headers.get('x-trace-id');
			const trace = await getTrace(collectorWorker, traceId!);

			expect(trace.resourceSpans.length).toBe(1);
			const resourceSpan = trace.resourceSpans[0];
			const resource = resourceSpan.resource;

			// Validate default resource attributes
			expect(
				resource.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.SERVICE_NAME)
			).toStrictEqual({ key: ATTRIBUTE_NAME.SERVICE_NAME, value: { stringValue: 'root-span' } });
			expect(
				resource.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.SDK_NAME)
			).toStrictEqual({ key: ATTRIBUTE_NAME.SDK_NAME, value: { stringValue: 'workers-tracing' } });
			expect(
				resource.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.SDK_LANG)
			).toStrictEqual({ key: ATTRIBUTE_NAME.SDK_LANG, value: { stringValue: 'javascript' } });
			expect(
				resource.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.SDK_VERSION)
			).toStrictEqual({ key: ATTRIBUTE_NAME.SDK_VERSION, value: { stringValue: '$VERSION$' } });
			expect(
				resource.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.RUNTIME_NAME)
			).toStrictEqual({ key: ATTRIBUTE_NAME.RUNTIME_NAME, value: { stringValue: 'Cloudflare-Workers' } });

			// Check spans
			expect(resourceSpan.scopeSpans.length).toBe(1);
			expect(resourceSpan.scopeSpans[0].scope.name).toBe('root-span');
			expect(resourceSpan.scopeSpans[0].spans.length).toBe(1);
			const span = resourceSpan.scopeSpans[0].spans[0];

			// Validate root span
			expect(span.name).toBe('Request (fetch event)');
			expect(span.endTimeUnixNano).not.toBe(0);
		});

		test('Root span with resource attributes', async () => {
			devWorker = await startWorker('test/scripts/api/root-span-resource-attributes.ts');

			const res = await devWorker.fetch('http://worker/test');

			expect(res.status).toBe(200);
			expect(res.headers.get('x-trace-id')).not.toBeNull();

			const traceId = res.headers.get('x-trace-id');
			const trace = await getTrace(collectorWorker, traceId!);

			expect(trace.resourceSpans.length).toBe(1);
			const resourceSpan = trace.resourceSpans[0];
			const resource = resourceSpan.resource;

			// Validate default resource attributes
			expect(
				resource.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.SERVICE_NAME)
			).toStrictEqual({ key: ATTRIBUTE_NAME.SERVICE_NAME, value: { stringValue: 'root-span-resource-attributes' } });
			expect(
				resource.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.SDK_NAME)
			).toStrictEqual({ key: ATTRIBUTE_NAME.SDK_NAME, value: { stringValue: 'workers-tracing' } });
			expect(
				resource.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.SDK_LANG)
			).toStrictEqual({ key: ATTRIBUTE_NAME.SDK_LANG, value: { stringValue: 'javascript' } });
			expect(
				resource.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.SDK_VERSION)
			).toStrictEqual({ key: ATTRIBUTE_NAME.SDK_VERSION, value: { stringValue: '$VERSION$' } });

			// Validate custom resource attributes
			expect(
				resource.attributes.find((attribute) => attribute.key === 'example')
			).toStrictEqual({ key: 'example', value: { boolValue: true } });
			expect(
				resource.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.RUNTIME_NAME)
			).toStrictEqual({ key: ATTRIBUTE_NAME.RUNTIME_NAME, value: { stringValue: 'blob-runtime' } });

			// Check spans
			expect(resourceSpan.scopeSpans.length).toBe(1);
			expect(resourceSpan.scopeSpans[0].scope.name).toBe('root-span-resource-attributes');
			expect(resourceSpan.scopeSpans[0].spans.length).toBe(1);
			const span = resourceSpan.scopeSpans[0].spans[0];

			// Validate root span
			expect(span.name).toBe('Request (fetch event)');
			expect(span.endTimeUnixNano).not.toBe(0);
		});

		test('Root span with attributes', async () => {
			devWorker = await startWorker('test/scripts/api/root-span-attributes.ts');

			const res = await devWorker.fetch('http://worker/test');

			expect(res.status).toBe(200);
			expect(res.headers.get('x-trace-id')).not.toBeNull();

			const traceId = res.headers.get('x-trace-id');
			const trace = await getTrace(collectorWorker, traceId!);

			expect(trace.resourceSpans.length).toBe(1);
			const resourceSpan = trace.resourceSpans[0];
			const resource = resourceSpan.resource;

			// Validate default resource attributes
			expect(
				resource.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.SERVICE_NAME)
			).toStrictEqual({ key: ATTRIBUTE_NAME.SERVICE_NAME, value: { stringValue: 'root-span-attributes' } });
			expect(
				resource.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.SDK_NAME)
			).toStrictEqual({ key: ATTRIBUTE_NAME.SDK_NAME, value: { stringValue: 'workers-tracing' } });
			expect(
				resource.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.SDK_LANG)
			).toStrictEqual({ key: ATTRIBUTE_NAME.SDK_LANG, value: { stringValue: 'javascript' } });
			expect(
				resource.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.SDK_VERSION)
			).toStrictEqual({ key: ATTRIBUTE_NAME.SDK_VERSION, value: { stringValue: '$VERSION$' } });
			expect(
				resource.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.RUNTIME_NAME)
			).toStrictEqual({ key: ATTRIBUTE_NAME.RUNTIME_NAME, value: { stringValue: 'Cloudflare-Workers' } });

			// Check spans
			expect(resourceSpan.scopeSpans.length).toBe(1);
			expect(resourceSpan.scopeSpans[0].scope.name).toBe('root-span-attributes');
			expect(resourceSpan.scopeSpans[0].spans.length).toBe(1);
			const span = resourceSpan.scopeSpans[0].spans[0];

			// Validate root span
			expect(span.name).toBe('Request (fetch event)');
			expect(span.endTimeUnixNano).not.toBe(0);

			// Validate custom attributes
			expect(
				span.attributes.find((attribute) => attribute.key === 'customAttribute')
			).toStrictEqual({ key: 'customAttribute', value: { intValue: 1337 } });
			expect(
				span.attributes.find((attribute) => attribute.key === 'workersTracing')
			).toStrictEqual({ key: 'workersTracing', value: { boolValue: true } });
		});

		test('Root span with status', async () => {
			devWorker = await startWorker('test/scripts/api/root-span-status.ts');

			const res = await devWorker.fetch('http://worker/test');

			expect(res.status).toBe(200);
			expect(res.headers.get('x-trace-id')).not.toBeNull();

			const traceId = res.headers.get('x-trace-id');
			const trace = await getTrace(collectorWorker, traceId!);

			expect(trace.resourceSpans.length).toBe(1);
			const resourceSpan = trace.resourceSpans[0];

			// Check spans
			expect(resourceSpan.scopeSpans.length).toBe(1);
			expect(resourceSpan.scopeSpans[0].scope.name).toBe('root-span-status');
			expect(resourceSpan.scopeSpans[0].spans.length).toBe(1);
			const span = resourceSpan.scopeSpans[0].spans[0];

			// Validate root span
			expect(span.name).toBe('Request (fetch event)');
			expect(span.endTimeUnixNano).not.toBe(0);

			// Validate status
			expect(span.status).toStrictEqual({ code: 1 });
		});

		test('Root span with events', async () => {
			devWorker = await startWorker('test/scripts/api/root-span-events.ts');

			const res = await devWorker.fetch('http://worker/test');

			expect(res.status).toBe(200);
			expect(res.headers.get('x-trace-id')).not.toBeNull();

			const traceId = res.headers.get('x-trace-id');
			const trace = await getTrace(collectorWorker, traceId!);

			expect(trace.resourceSpans.length).toBe(1);
			const resourceSpan = trace.resourceSpans[0];

			// Check spans
			expect(resourceSpan.scopeSpans.length).toBe(1);
			expect(resourceSpan.scopeSpans[0].scope.name).toBe('root-span-events');
			expect(resourceSpan.scopeSpans[0].spans.length).toBe(1);
			const span = resourceSpan.scopeSpans[0].spans[0];

			// Validate root span
			expect(span.name).toBe('Request (fetch event)');
			expect(span.endTimeUnixNano).not.toBe(0);

			// Validate events
			expect(span.events.length).toBe(1);
			expect(span.events[0].name).toBe('Fetch done');
			expect(span.events[0].timestamp).not.toBe(0);
		});

		test('Root span with links', async () => {
			devWorker = await startWorker('test/scripts/api/root-span-links.ts');

			const res = await devWorker.fetch('http://worker/test');

			expect(res.status).toBe(200);
			expect(res.headers.get('x-trace-id')).not.toBeNull();

			const traceId = res.headers.get('x-trace-id');
			const trace = await getTrace(collectorWorker, traceId!);

			expect(trace.resourceSpans.length).toBe(1);
			const resourceSpan = trace.resourceSpans[0];

			// Check spans
			expect(resourceSpan.scopeSpans.length).toBe(1);
			expect(resourceSpan.scopeSpans[0].scope.name).toBe('root-span-links');
			expect(resourceSpan.scopeSpans[0].spans.length).toBe(1);
			const span = resourceSpan.scopeSpans[0].spans[0];

			// Validate root span
			expect(span.name).toBe('Request (fetch event)');
			expect(span.endTimeUnixNano).not.toBe(0);

			// Validate links
			expect(span.links.length).toBe(2);
			expect(span.links[0]).toStrictEqual({
				traceId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
				spanId: 'bbbbbbbbbbbbbbbb',
				attributes: [],
			});
			expect(span.links[1]).toStrictEqual({
				traceId: 'cccccccccccccccccccccccccccccccc',
				spanId: 'dddddddddddddddd',
				attributes: [
					{
						key: 'link',
						value: {
							intValue: 2,
						}
					},
					{
						key: 'muchWow',
						value: {
							boolValue: true,
						},
					},
				],
			});
		});
	});
});
