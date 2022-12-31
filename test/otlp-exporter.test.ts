import { OtlpJson } from 'src/transformers/otlp';
import { ATTRIBUTE_NAME, SPAN_NAME } from 'src/utils/constants';
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';
import { UnstableDevWorker } from 'wrangler';
import { getTrace } from './utils/trace';
import { startCollector, startWorker } from './utils/worker';

let devWorker: UnstableDevWorker;
let collectorWorker: UnstableDevWorker;

describe('Test OTLP Exporter', () => {
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

	test('Basic trace should transform correctly', async () => {
		devWorker = await startWorker('test/scripts/otlp/basic.ts');

		const res = await devWorker.fetch('http://worker/test');

		expect(res.status).toBe(200);
		expect(res.headers.get('x-trace-id')).not.toBeNull();

		const traceId = res.headers.get('x-trace-id');
		if (traceId === null) {
			expect(traceId).not.toBeNull();
			return;
		}
		const trace = await getTrace<OtlpJson>(collectorWorker, traceId);

		expect(trace.resourceSpans.length).toBe(1);
		const resourceSpan = trace.resourceSpans[0];

		expect(resourceSpan.scopeSpans.length).toBe(1);
		expect(resourceSpan.scopeSpans[0].scope.name).toBe('otlp-basic');
		expect(resourceSpan.scopeSpans[0].spans.length).toBe(1);
		
		const span = resourceSpan.scopeSpans[0].spans[0];
		expect(span.traceId).toBe(traceId);
		expect(span.name).toBe('Request (fetch event)');
	});

	describe('Resource', () => {
		test('Default attributes are put on resource', async () => {
			devWorker = await startWorker('test/scripts/otlp/basic.ts');

			const res = await devWorker.fetch('http://worker/test');

			expect(res.status).toBe(200);
			expect(res.headers.get('x-trace-id')).not.toBeNull();

			const traceId = res.headers.get('x-trace-id');
			if (traceId === null) {
				expect(traceId).not.toBeNull();
				return;
			}
			const trace = await getTrace<OtlpJson>(collectorWorker, traceId);

			expect(trace.resourceSpans.length).toBe(1);
			const resourceSpan = trace.resourceSpans[0];

			expect(resourceSpan.scopeSpans.length).toBe(1);
			expect(resourceSpan.scopeSpans[0].scope.name).toBe('otlp-basic');
			expect(resourceSpan.scopeSpans[0].spans.length).toBe(1);

			const resource = resourceSpan.resource;

			// Check attributes
			expect(resource.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.SERVICE_NAME))
				.toStrictEqual({ key: ATTRIBUTE_NAME.SERVICE_NAME, value: { stringValue: 'otlp-basic' } });
			expect(resource.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.SDK_NAME))
				.toStrictEqual({ key: ATTRIBUTE_NAME.SDK_NAME, value: { stringValue: 'workers-tracing' } });
			expect(resource.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.SDK_LANG))
				.toStrictEqual({ key: ATTRIBUTE_NAME.SDK_LANG, value: { stringValue: 'javascript' } });
			expect(resource.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.SDK_VERSION))
				.toStrictEqual({ key: ATTRIBUTE_NAME.SDK_VERSION, value: { stringValue: '__VERSION__' } });
			expect(resource.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.RUNTIME_NAME))
				.toStrictEqual({ key: ATTRIBUTE_NAME.RUNTIME_NAME, value: { stringValue: 'Cloudflare-Workers' } });
		});

		test('You can add attributes on resource', async () => {
			devWorker = await startWorker('test/scripts/otlp/resource-attributes.ts');

			const res = await devWorker.fetch('http://worker/test');

			expect(res.status).toBe(200);
			expect(res.headers.get('x-trace-id')).not.toBeNull();

			const traceId = res.headers.get('x-trace-id');
			if (traceId === null) {
				expect(traceId).not.toBeNull();
				return;
			}
			const trace = await getTrace<OtlpJson>(collectorWorker, traceId);

			expect(trace.resourceSpans.length).toBe(1);
			const resourceSpan = trace.resourceSpans[0];

			expect(resourceSpan.scopeSpans.length).toBe(1);
			expect(resourceSpan.scopeSpans[0].scope.name).toBe('resource-attributes');
			expect(resourceSpan.scopeSpans[0].spans.length).toBe(1);
			
			const resource = resourceSpan.resource;

			// Check attributes
			expect(resource.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.SERVICE_NAME))
				.toStrictEqual({ key: ATTRIBUTE_NAME.SERVICE_NAME, value: { stringValue: 'resource-attributes' } });
			expect(resource.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.SDK_NAME))
				.toStrictEqual({ key: ATTRIBUTE_NAME.SDK_NAME, value: { stringValue: 'workers-tracing' } });
			expect(resource.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.SDK_LANG))
				.toStrictEqual({ key: ATTRIBUTE_NAME.SDK_LANG, value: { stringValue: 'javascript' } });
			expect(resource.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.SDK_VERSION))
				.toStrictEqual({ key: ATTRIBUTE_NAME.SDK_VERSION, value: { stringValue: '__VERSION__' } });

			// Custom attributes
			expect(resource.attributes.find((attribute) => attribute.key === 'exampleAttribute'))
				.toStrictEqual({ key: 'exampleAttribute', value: { boolValue: true } });
			expect(resource.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.RUNTIME_NAME))
				.toStrictEqual({ key: ATTRIBUTE_NAME.RUNTIME_NAME, value: { stringValue: 'blob-runtime' } });
		});
	});

	describe('Single span', () => {
		test('You can add a single span', async () => {
			devWorker = await startWorker('test/scripts/otlp/single-span.ts');

			const res = await devWorker.fetch('http://worker/test');

			expect(res.status).toBe(200);
			expect(res.headers.get('x-trace-id')).not.toBeNull();

			const traceId = res.headers.get('x-trace-id');
			if (traceId === null) {
				expect(traceId).not.toBeNull();
				return;
			}
			const trace = await getTrace<OtlpJson>(collectorWorker, traceId);

			// Root + child
			expect(trace.resourceSpans.length).toBe(1);
			const resourceSpan = trace.resourceSpans[0];

			expect(resourceSpan.scopeSpans.length).toBe(1);
			expect(resourceSpan.scopeSpans[0].scope.name).toBe('single-span');
			expect(resourceSpan.scopeSpans[0].spans.length).toBe(2);

			const spans = resourceSpan.scopeSpans[0].spans;

			// Root span
			const rootSpan = spans[0];
			expect(rootSpan.traceId).toBe(traceId);
			expect(rootSpan.name).toBe('Request (fetch event)');
			expect(rootSpan.endTimeUnixNano).not.toBe(0);

			// Child span
			const childSpan = spans[1];
			expect(childSpan.traceId).toBe(traceId);
			expect(childSpan.parentSpanId).toBe(rootSpan.spanId);
			expect(childSpan.name).toBe(SPAN_NAME.FETCH);
			expect(childSpan.endTimeUnixNano).not.toBe(0);
		});

		test('You can add a single span with attributes', async () => {
			devWorker = await startWorker('test/scripts/otlp/single-span-attributes.ts');

			const res = await devWorker.fetch('http://worker/test');

			expect(res.status).toBe(200);
			expect(res.headers.get('x-trace-id')).not.toBeNull();

			const traceId = res.headers.get('x-trace-id');
			if (traceId === null) {
				expect(traceId).not.toBeNull();
				return;
			}
			const trace = await getTrace<OtlpJson>(collectorWorker, traceId);

			// Root + child
			expect(trace.resourceSpans.length).toBe(1);
			const resourceSpan = trace.resourceSpans[0];

			expect(resourceSpan.scopeSpans.length).toBe(1);
			expect(resourceSpan.scopeSpans[0].scope.name).toBe('single-span-attributes');
			expect(resourceSpan.scopeSpans[0].spans.length).toBe(2);

			const spans = resourceSpan.scopeSpans[0].spans;

			// Root span
			const rootSpan = spans[0];
			expect(rootSpan.traceId).toBe(traceId);
			expect(rootSpan.name).toBe('Request (fetch event)');
			expect(rootSpan.endTimeUnixNano).not.toBe(0);

			// Child span
			const childSpan = spans[1];
			expect(childSpan.traceId).toBe(traceId);
			expect(childSpan.parentSpanId).toBe(rootSpan.spanId);
			expect(childSpan.name).toBe(SPAN_NAME.FETCH);
			expect(childSpan.endTimeUnixNano).not.toBe(0);
			expect(childSpan.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.HTTP_HOST))
				.toStrictEqual({ key: ATTRIBUTE_NAME.HTTP_HOST, value: { stringValue: 'example.com' } });
		});

		test('You can add a single span with events', async () => {
			devWorker = await startWorker('test/scripts/otlp/single-span-events.ts');

			const res = await devWorker.fetch('http://worker/test');

			expect(res.status).toBe(200);
			expect(res.headers.get('x-trace-id')).not.toBeNull();

			const traceId = res.headers.get('x-trace-id');
			if (traceId === null) {
				expect(traceId).not.toBeNull();
				return;
			}
			const trace = await getTrace<OtlpJson>(collectorWorker, traceId);

			// Root + child
			expect(trace.resourceSpans.length).toBe(1);
			const resourceSpan = trace.resourceSpans[0];

			expect(resourceSpan.scopeSpans.length).toBe(1);
			expect(resourceSpan.scopeSpans[0].scope.name).toBe('single-span-events');
			expect(resourceSpan.scopeSpans[0].spans.length).toBe(2);

			const spans = resourceSpan.scopeSpans[0].spans;

			// Root span
			const rootSpan = spans[0];
			expect(rootSpan.traceId).toBe(traceId);
			expect(rootSpan.name).toBe('Request (fetch event)');
			expect(rootSpan.endTimeUnixNano).not.toBe(0);

			// Child span
			const childSpan = spans[1];
			expect(childSpan.traceId).toBe(traceId);
			expect(childSpan.parentSpanId).toBe(rootSpan.spanId);
			expect(childSpan.name).toBe(SPAN_NAME.FETCH);
			expect(childSpan.endTimeUnixNano).not.toBe(0);

			expect(childSpan.events.length).toBe(2);
			
			expect(childSpan.events[0].name).toBe('Fetch done');
			expect(childSpan.events[0].timeUnixNano).not.toBe(0);
			expect(childSpan.events[0].attributes.length).toBe(1);
			expect(childSpan.events[0].attributes[0])
				.toStrictEqual({ key: ATTRIBUTE_NAME.HTTP_HOST, value: { stringValue: 'example.com' } });

			expect(childSpan.events[1].name).toBe('Response body parsed');
			expect(childSpan.events[1].timeUnixNano).not.toBe(0);
			expect(childSpan.events[1].attributes.length).toBe(1);
			expect(childSpan.events[1].attributes[0])
				.toStrictEqual({ key: 'parsed', value: { stringValue: 'text' } });
		});

		test('You can add a single span with attributes and events', async () => {
			devWorker = await startWorker('test/scripts/otlp/single-span-attributes-and-events.ts');

			const res = await devWorker.fetch('http://worker/test');

			expect(res.status).toBe(200);
			expect(res.headers.get('x-trace-id')).not.toBeNull();

			const traceId = res.headers.get('x-trace-id');
			if (traceId === null) {
				expect(traceId).not.toBeNull();
				return;
			}
			const trace = await getTrace<OtlpJson>(collectorWorker, traceId);

			// Root + child
			expect(trace.resourceSpans.length).toBe(1);
			const resourceSpan = trace.resourceSpans[0];

			expect(resourceSpan.scopeSpans.length).toBe(1);
			expect(resourceSpan.scopeSpans[0].scope.name).toBe('single-span-attributes-and-events');
			expect(resourceSpan.scopeSpans[0].spans.length).toBe(2);

			const spans = resourceSpan.scopeSpans[0].spans;

			// Root span
			const rootSpan = spans[0];
			expect(rootSpan.traceId).toBe(traceId);
			expect(rootSpan.name).toBe('Request (fetch event)');
			expect(rootSpan.endTimeUnixNano).not.toBe(0);

			// Child span
			const childSpan = spans[1];
			expect(childSpan.traceId).toBe(traceId);
			expect(childSpan.parentSpanId).toBe(rootSpan.spanId);
			expect(childSpan.name).toBe(SPAN_NAME.FETCH);
			expect(childSpan.endTimeUnixNano).not.toBe(0);
			expect(childSpan.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.HTTP_HOST))
				.toStrictEqual({ key: ATTRIBUTE_NAME.HTTP_HOST, value: { stringValue: 'example.com' } });

			expect(childSpan.events.length).toBe(2);
			expect(childSpan.events[0].name).toBe('Fetch done');
			expect(childSpan.events[0].timeUnixNano).not.toBe(0);
			expect(childSpan.events[0].attributes.length).toBe(1);
			expect(childSpan.events[0].attributes[0])
				.toStrictEqual({ key: ATTRIBUTE_NAME.HTTP_HOST, value: { stringValue: 'example.com' } });

			expect(childSpan.events[1].name).toBe('Response body parsed');
			expect(childSpan.events[1].timeUnixNano).not.toBe(0);
			expect(childSpan.events[1].attributes.length).toBe(1);
			expect(childSpan.events[1].attributes[0])
				.toStrictEqual({ key: 'parsed', value: { stringValue: 'text' } });
		});
	});

	describe('Multiple spans', () => {
		test('You can add multiple spans', async () => {
			devWorker = await startWorker('test/scripts/otlp/multiple-spans.ts', {
				kv: [ { binding: 'KV', id: '' } ],
			});

			const res = await devWorker.fetch('http://worker/test');

			expect(res.status).toBe(200);
			expect(res.headers.get('x-trace-id')).not.toBeNull();

			const traceId = res.headers.get('x-trace-id');
			if (traceId === null) {
				expect(traceId).not.toBeNull();
				return;
			}
			const trace = await getTrace<OtlpJson>(collectorWorker, traceId);

			// Root + 2 children
			expect(trace.resourceSpans.length).toBe(1);
			const resourceSpan = trace.resourceSpans[0];

			expect(resourceSpan.scopeSpans.length).toBe(1);
			expect(resourceSpan.scopeSpans[0].scope.name).toBe('multiple-spans');
			expect(resourceSpan.scopeSpans[0].spans.length).toBe(3);

			const spans = resourceSpan.scopeSpans[0].spans;

			// Root span
			const rootSpan = spans[0];
			expect(rootSpan.traceId).toBe(traceId);
			expect(rootSpan.name).toBe('Request (fetch event)');
			expect(rootSpan.endTimeUnixNano).not.toBe(0);

			// First child span
			const firstChildSpan = spans[1];
			expect(firstChildSpan.traceId).toBe(traceId);
			expect(firstChildSpan.parentSpanId).toBe(rootSpan.spanId);
			expect(firstChildSpan.name).toBe(SPAN_NAME.FETCH);
			expect(firstChildSpan.endTimeUnixNano).not.toBe(0);

			// Second child span
			const secondChildSpan = spans[2];
			expect(secondChildSpan.traceId).toBe(traceId);
			expect(secondChildSpan.parentSpanId).toBe(rootSpan.spanId);
			expect(secondChildSpan.name).toBe(SPAN_NAME.KV_GET);
			expect(secondChildSpan.endTimeUnixNano).not.toBe(0);
		});

		test('You can add multiple spans with attributes', async () => {
			devWorker = await startWorker('test/scripts/otlp/multiple-spans-attributes.ts', {
				kv: [ { binding: 'KV', id: '' } ],
			});

			const res = await devWorker.fetch('http://worker/test');

			expect(res.status).toBe(200);
			expect(res.headers.get('x-trace-id')).not.toBeNull();

			const traceId = res.headers.get('x-trace-id');
			if (traceId === null) {
				expect(traceId).not.toBeNull();
				return;
			}
			const trace = await getTrace<OtlpJson>(collectorWorker, traceId);

			// Root + 2 children
			expect(trace.resourceSpans.length).toBe(1);
			const resourceSpan = trace.resourceSpans[0];

			expect(resourceSpan.scopeSpans.length).toBe(1);
			expect(resourceSpan.scopeSpans[0].scope.name).toBe('multiple-spans-attributes');
			expect(resourceSpan.scopeSpans[0].spans.length).toBe(3);

			const spans = resourceSpan.scopeSpans[0].spans;

			// Root span
			const rootSpan = spans[0];
			expect(rootSpan.traceId).toBe(traceId);
			expect(rootSpan.name).toBe('Request (fetch event)');
			expect(rootSpan.endTimeUnixNano).not.toBe(0);

			// First child span
			const firstChildSpan = spans[1];
			expect(firstChildSpan.traceId).toBe(traceId);
			expect(firstChildSpan.parentSpanId).toBe(rootSpan.spanId);
			expect(firstChildSpan.name).toBe(SPAN_NAME.FETCH);
			expect(firstChildSpan.endTimeUnixNano).not.toBe(0);
			expect(firstChildSpan.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.HTTP_HOST))
				.toStrictEqual({ key: ATTRIBUTE_NAME.HTTP_HOST, value: { stringValue: 'example.com' } });

			// Second child span
			const secondChildSpan = spans[2];
			expect(secondChildSpan.traceId).toBe(traceId);
			expect(secondChildSpan.parentSpanId).toBe(rootSpan.spanId);
			expect(secondChildSpan.name).toBe(SPAN_NAME.KV_GET);
			expect(secondChildSpan.endTimeUnixNano).not.toBe(0);
			expect(secondChildSpan.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.KV_KEY))
				.toStrictEqual({ key: ATTRIBUTE_NAME.KV_KEY, value: { stringValue: 'abc' } });
		});

		test('You can add multiple spans with events', async () => {
			devWorker = await startWorker('test/scripts/otlp/multiple-spans-events.ts', {
				kv: [ { binding: 'KV', id: '' } ],
			});

			const res = await devWorker.fetch('http://worker/test');

			expect(res.status).toBe(200);
			expect(res.headers.get('x-trace-id')).not.toBeNull();

			const traceId = res.headers.get('x-trace-id');
			if (traceId === null) {
				expect(traceId).not.toBeNull();
				return;
			}
			const trace = await getTrace<OtlpJson>(collectorWorker, traceId);

			// Root + 2 children
			expect(trace.resourceSpans.length).toBe(1);
			const resourceSpan = trace.resourceSpans[0];

			expect(resourceSpan.scopeSpans.length).toBe(1);
			expect(resourceSpan.scopeSpans[0].scope.name).toBe('multiple-spans-events');
			expect(resourceSpan.scopeSpans[0].spans.length).toBe(3);

			const spans = resourceSpan.scopeSpans[0].spans;

			// Root span
			const rootSpan = spans[0];
			expect(rootSpan.traceId).toBe(traceId);
			expect(rootSpan.name).toBe('Request (fetch event)');
			expect(rootSpan.endTimeUnixNano).not.toBe(0);

			// First child span
			const firstChildSpan = spans[1];
			expect(firstChildSpan.traceId).toBe(traceId);
			expect(firstChildSpan.parentSpanId).toBe(rootSpan.spanId);
			expect(firstChildSpan.name).toBe(SPAN_NAME.FETCH);
			expect(firstChildSpan.endTimeUnixNano).not.toBe(0);

			// - Events
			expect(firstChildSpan.events.length).toBe(2);
			expect(firstChildSpan.events[0].name).toBe('Fetch done');
			expect(firstChildSpan.events[0].timeUnixNano).not.toBe(0);
			expect(firstChildSpan.events[0].attributes.length).toBe(1);
			expect(firstChildSpan.events[0].attributes[0])
				.toStrictEqual({ key: ATTRIBUTE_NAME.HTTP_HOST, value: { stringValue: 'example.com' } });

			expect(firstChildSpan.events[1].name).toBe('Response body parsed');
			expect(firstChildSpan.events[1].timeUnixNano).not.toBe(0);
			expect(firstChildSpan.events[1].attributes.length).toBe(1);
			expect(firstChildSpan.events[1].attributes[0])
				.toStrictEqual({ key: 'parsed', value: { stringValue: 'text' } });

			// Second child span
			const secondChildSpan = spans[2];
			expect(secondChildSpan.traceId).toBe(traceId);
			expect(secondChildSpan.parentSpanId).toBe(rootSpan.spanId);
			expect(secondChildSpan.name).toBe(SPAN_NAME.KV_GET);
			expect(secondChildSpan.endTimeUnixNano).not.toBe(0);

			// - Events
			expect(secondChildSpan.events.length).toBe(1);
			expect(secondChildSpan.events[0].name).toBe('KV get done');
			expect(secondChildSpan.events[0].timeUnixNano).not.toBe(0);
			expect(secondChildSpan.events[0].attributes.length).toBe(1);
			expect(secondChildSpan.events[0].attributes[0])
				.toStrictEqual({ key: ATTRIBUTE_NAME.KV_KEY, value: { stringValue: 'abc' } });
		});

		test('You can add multiple spans with attributes and events', async () => {
			devWorker = await startWorker('test/scripts/otlp/multiple-spans-attributes-and-events.ts', {
				kv: [ { binding: 'KV', id: '' } ],
			});

			const res = await devWorker.fetch('http://worker/test');

			expect(res.status).toBe(200);
			expect(res.headers.get('x-trace-id')).not.toBeNull();

			const traceId = res.headers.get('x-trace-id');
			if (traceId === null) {
				expect(traceId).not.toBeNull();
				return;
			}
			const trace = await getTrace<OtlpJson>(collectorWorker, traceId);

			// Root + 2 children
			expect(trace.resourceSpans.length).toBe(1);
			const resourceSpan = trace.resourceSpans[0];

			expect(resourceSpan.scopeSpans.length).toBe(1);
			expect(resourceSpan.scopeSpans[0].scope.name).toBe('multiple-spans-attributes-and-events');
			expect(resourceSpan.scopeSpans[0].spans.length).toBe(3);

			const spans = resourceSpan.scopeSpans[0].spans;

			// Root span
			const rootSpan = spans[0];
			expect(rootSpan.traceId).toBe(traceId);
			expect(rootSpan.name).toBe('Request (fetch event)');
			expect(rootSpan.endTimeUnixNano).not.toBe(0);

			// First child span
			const firstChildSpan = spans[1];
			expect(firstChildSpan.traceId).toBe(traceId);
			expect(firstChildSpan.parentSpanId).toBe(rootSpan.spanId);
			expect(firstChildSpan.name).toBe(SPAN_NAME.FETCH);
			expect(firstChildSpan.endTimeUnixNano).not.toBe(0);
			expect(firstChildSpan.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.HTTP_HOST))
				.toStrictEqual({ key: ATTRIBUTE_NAME.HTTP_HOST, value: { stringValue: 'example.com' } });

			// - Events
			expect(firstChildSpan.events.length).toBe(2);
			expect(firstChildSpan.events[0].name).toBe('Fetch done');
			expect(firstChildSpan.events[0].timeUnixNano).not.toBe(0);
			expect(firstChildSpan.events[0].attributes.length).toBe(1);
			expect(firstChildSpan.events[0].attributes[0])
				.toStrictEqual({ key: ATTRIBUTE_NAME.HTTP_HOST, value: { stringValue: 'example.com' } });

			expect(firstChildSpan.events[1].name).toBe('Response body parsed');
			expect(firstChildSpan.events[1].timeUnixNano).not.toBe(0);
			expect(firstChildSpan.events[1].attributes.length).toBe(1);
			expect(firstChildSpan.events[1].attributes[0])
				.toStrictEqual({ key: 'parsed', value: { stringValue: 'text' } });

			// Second child span
			const secondChildSpan = spans[2];
			expect(secondChildSpan.traceId).toBe(traceId);
			expect(secondChildSpan.parentSpanId).toBe(rootSpan.spanId);
			expect(secondChildSpan.name).toBe(SPAN_NAME.KV_GET);
			expect(secondChildSpan.endTimeUnixNano).not.toBe(0);
			expect(secondChildSpan.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.KV_KEY))
				.toStrictEqual({ key: ATTRIBUTE_NAME.KV_KEY, value: { stringValue: 'abc' } });

			// - Events
			expect(secondChildSpan.events.length).toBe(1);
			expect(secondChildSpan.events[0].name).toBe('KV get done');
			expect(secondChildSpan.events[0].timeUnixNano).not.toBe(0);
			expect(secondChildSpan.events[0].attributes.length).toBe(1);
			expect(secondChildSpan.events[0].attributes[0])
				.toStrictEqual({ key: ATTRIBUTE_NAME.KV_KEY, value: { stringValue: 'abc' } });
		});
	});

	describe('Child of child span', () => {
		test('You can add a child to a child span', async () => {
			devWorker = await startWorker('test/scripts/otlp/span-span.ts', {
				kv: [ { binding: 'KV', id: '' } ],
			});

			const res = await devWorker.fetch('http://worker/test');

			expect(res.status).toBe(200);
			expect(res.headers.get('x-trace-id')).not.toBeNull();

			const traceId = res.headers.get('x-trace-id');
			if (traceId === null) {
				expect(traceId).not.toBeNull();
				return;
			}
			const trace = await getTrace<OtlpJson>(collectorWorker, traceId);

			// Root + 2 children
			expect(trace.resourceSpans.length).toBe(1);
			const resourceSpan = trace.resourceSpans[0];

			expect(resourceSpan.scopeSpans.length).toBe(1);
			expect(resourceSpan.scopeSpans[0].scope.name).toBe('span-span');
			expect(resourceSpan.scopeSpans[0].spans.length).toBe(3);

			const spans = resourceSpan.scopeSpans[0].spans;

			// Root span
			const rootSpan = spans[0];
			expect(rootSpan.traceId).toBe(traceId);
			expect(rootSpan.name).toBe('Request (fetch event)');
			expect(rootSpan.endTimeUnixNano).not.toBe(0);

			// First child span
			const firstChildSpan = spans[1];
			expect(firstChildSpan.traceId).toBe(traceId);
			expect(firstChildSpan.parentSpanId).toBe(rootSpan.spanId);
			expect(firstChildSpan.name).toBe(SPAN_NAME.FETCH);
			expect(firstChildSpan.endTimeUnixNano).not.toBe(0);

			// Second child span
			const secondChildSpan = spans[2];
			expect(secondChildSpan.traceId).toBe(traceId);
			// Validate this is a child of the first child
			expect(secondChildSpan.parentSpanId).toBe(firstChildSpan.spanId);
			expect(secondChildSpan.name).toBe(SPAN_NAME.KV_GET);
			expect(secondChildSpan.endTimeUnixNano).not.toBe(0);
		});

		test('You can add a child to a child span with attributes', async () => {
			devWorker = await startWorker('test/scripts/otlp/span-span-attributes.ts', {
				kv: [ { binding: 'KV', id: '' } ],
			});

			const res = await devWorker.fetch('http://worker/test');

			expect(res.status).toBe(200);
			expect(res.headers.get('x-trace-id')).not.toBeNull();

			const traceId = res.headers.get('x-trace-id');
			if (traceId === null) {
				expect(traceId).not.toBeNull();
				return;
			}
			const trace = await getTrace<OtlpJson>(collectorWorker, traceId);

			// Root + 2 children
			expect(trace.resourceSpans.length).toBe(1);
			const resourceSpan = trace.resourceSpans[0];

			expect(resourceSpan.scopeSpans.length).toBe(1);
			expect(resourceSpan.scopeSpans[0].scope.name).toBe('span-span-attributes');
			expect(resourceSpan.scopeSpans[0].spans.length).toBe(3);

			const spans = resourceSpan.scopeSpans[0].spans;

			// Root span
			const rootSpan = spans[0];
			expect(rootSpan.traceId).toBe(traceId);
			expect(rootSpan.name).toBe('Request (fetch event)');
			expect(rootSpan.endTimeUnixNano).not.toBe(0);

			// First child span
			const firstChildSpan = spans[1];
			expect(firstChildSpan.traceId).toBe(traceId);
			expect(firstChildSpan.parentSpanId).toBe(rootSpan.spanId);
			expect(firstChildSpan.name).toBe(SPAN_NAME.FETCH);
			expect(firstChildSpan.endTimeUnixNano).not.toBe(0);
			expect(firstChildSpan.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.HTTP_HOST))
				.toStrictEqual({ key: ATTRIBUTE_NAME.HTTP_HOST, value: { stringValue: 'example.com' } });

			// Second child span
			const secondChildSpan = spans[2];
			expect(secondChildSpan.traceId).toBe(traceId);
			// Validate this is a child of the first child
			expect(secondChildSpan.parentSpanId).toBe(firstChildSpan.spanId);
			expect(secondChildSpan.name).toBe(SPAN_NAME.KV_GET);
			expect(secondChildSpan.endTimeUnixNano).not.toBe(0);
			expect(secondChildSpan.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.KV_KEY))
				.toStrictEqual({ key: ATTRIBUTE_NAME.KV_KEY, value: { stringValue: 'abc' } });
		});

		test('You can add a child to a child span with events', async () => {
			devWorker = await startWorker('test/scripts/otlp/span-span-events.ts', {
				kv: [ { binding: 'KV', id: '' } ],
			});

			const res = await devWorker.fetch('http://worker/test');

			expect(res.status).toBe(200);
			expect(res.headers.get('x-trace-id')).not.toBeNull();

			const traceId = res.headers.get('x-trace-id');
			if (traceId === null) {
				expect(traceId).not.toBeNull();
				return;
			}
			const trace = await getTrace<OtlpJson>(collectorWorker, traceId);

			// Root + 2 children
			expect(trace.resourceSpans.length).toBe(1);
			const resourceSpan = trace.resourceSpans[0];

			expect(resourceSpan.scopeSpans.length).toBe(1);
			expect(resourceSpan.scopeSpans[0].scope.name).toBe('span-span-events');
			expect(resourceSpan.scopeSpans[0].spans.length).toBe(3);

			const spans = resourceSpan.scopeSpans[0].spans;

			// Root span
			const rootSpan = spans[0];
			expect(rootSpan.traceId).toBe(traceId);
			expect(rootSpan.name).toBe('Request (fetch event)');
			expect(rootSpan.endTimeUnixNano).not.toBe(0);

			// First child span
			const firstChildSpan = spans[1];
			expect(firstChildSpan.traceId).toBe(traceId);
			expect(firstChildSpan.parentSpanId).toBe(rootSpan.spanId);
			expect(firstChildSpan.name).toBe(SPAN_NAME.FETCH);
			expect(firstChildSpan.endTimeUnixNano).not.toBe(0);

			// - Events
			expect(firstChildSpan.events.length).toBe(2);
			expect(firstChildSpan.events[0].name).toBe('Fetch done');
			expect(firstChildSpan.events[0].timeUnixNano).not.toBe(0);
			expect(firstChildSpan.events[0].attributes.length).toBe(1);
			expect(firstChildSpan.events[0].attributes[0])
				.toStrictEqual({ key: ATTRIBUTE_NAME.HTTP_HOST, value: { stringValue: 'example.com' } });

			expect(firstChildSpan.events[1].name).toBe('Response body parsed');
			expect(firstChildSpan.events[1].timeUnixNano).not.toBe(0);
			expect(firstChildSpan.events[1].attributes.length).toBe(1);
			expect(firstChildSpan.events[1].attributes[0])
				.toStrictEqual({ key: 'parsed', value: { stringValue: 'text' } });

			// Second child span
			const secondChildSpan = spans[2];
			expect(secondChildSpan.traceId).toBe(traceId);
			// Validate this is a child of the first child
			expect(secondChildSpan.parentSpanId).toBe(firstChildSpan.spanId);
			expect(secondChildSpan.name).toBe(SPAN_NAME.KV_GET);
			expect(secondChildSpan.endTimeUnixNano).not.toBe(0);

			// - Events
			expect(secondChildSpan.events.length).toBe(1);
			expect(secondChildSpan.events[0].name).toBe('KV get done');
			expect(secondChildSpan.events[0].timeUnixNano).not.toBe(0);
			expect(secondChildSpan.events[0].attributes.length).toBe(1);
			expect(secondChildSpan.events[0].attributes[0])
				.toStrictEqual({ key: ATTRIBUTE_NAME.KV_KEY, value: { stringValue: 'abc' } });
		});

		test('You can add a child to a child span with attributes and events', async () => {
			devWorker = await startWorker('test/scripts/otlp/span-span-attributes-and-events.ts', {
				kv: [ { binding: 'KV', id: '' } ],
			});

			const res = await devWorker.fetch('http://worker/test');

			expect(res.status).toBe(200);
			expect(res.headers.get('x-trace-id')).not.toBeNull();

			const traceId = res.headers.get('x-trace-id');
			if (traceId === null) {
				expect(traceId).not.toBeNull();
				return;
			}
			const trace = await getTrace<OtlpJson>(collectorWorker, traceId);

			// Root + 2 children
			expect(trace.resourceSpans.length).toBe(1);
			const resourceSpan = trace.resourceSpans[0];

			expect(resourceSpan.scopeSpans.length).toBe(1);
			expect(resourceSpan.scopeSpans[0].scope.name).toBe('span-span-attributes-and-events');
			expect(resourceSpan.scopeSpans[0].spans.length).toBe(3);

			const spans = resourceSpan.scopeSpans[0].spans;

			// Root span
			const rootSpan = spans[0];
			expect(rootSpan.traceId).toBe(traceId);
			expect(rootSpan.name).toBe('Request (fetch event)');
			expect(rootSpan.endTimeUnixNano).not.toBe(0);

			// First child span
			const firstChildSpan = spans[1];
			expect(firstChildSpan.traceId).toBe(traceId);
			expect(firstChildSpan.parentSpanId).toBe(rootSpan.spanId);
			expect(firstChildSpan.name).toBe(SPAN_NAME.FETCH);
			expect(firstChildSpan.endTimeUnixNano).not.toBe(0);
			expect(firstChildSpan.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.HTTP_HOST))
				.toStrictEqual({ key: ATTRIBUTE_NAME.HTTP_HOST, value: { stringValue: 'example.com' } });

			// - Events
			expect(firstChildSpan.events.length).toBe(2);
			expect(firstChildSpan.events[0].name).toBe('Fetch done');
			expect(firstChildSpan.events[0].timeUnixNano).not.toBe(0);
			expect(firstChildSpan.events[0].attributes.length).toBe(1);
			expect(firstChildSpan.events[0].attributes[0])
				.toStrictEqual({ key: ATTRIBUTE_NAME.HTTP_HOST, value: { stringValue: 'example.com' } });

			expect(firstChildSpan.events[1].name).toBe('Response body parsed');
			expect(firstChildSpan.events[1].timeUnixNano).not.toBe(0);
			expect(firstChildSpan.events[1].attributes.length).toBe(1);
			expect(firstChildSpan.events[1].attributes[0])
				.toStrictEqual({ key: 'parsed', value: { stringValue: 'text' } });

			// Second child span
			const secondChildSpan = spans[2];
			expect(secondChildSpan.traceId).toBe(traceId);
			// Validate this is a child of the first child
			expect(secondChildSpan.parentSpanId).toBe(firstChildSpan.spanId);
			expect(secondChildSpan.name).toBe(SPAN_NAME.KV_GET);
			expect(secondChildSpan.endTimeUnixNano).not.toBe(0);
			expect(secondChildSpan.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.KV_KEY))
				.toStrictEqual({ key: ATTRIBUTE_NAME.KV_KEY, value: { stringValue: 'abc' } });

			// - Events
			expect(secondChildSpan.events.length).toBe(1);
			expect(secondChildSpan.events[0].name).toBe('KV get done');
			expect(secondChildSpan.events[0].timeUnixNano).not.toBe(0);
			expect(secondChildSpan.events[0].attributes.length).toBe(1);
			expect(secondChildSpan.events[0].attributes[0])
				.toStrictEqual({ key: ATTRIBUTE_NAME.KV_KEY, value: { stringValue: 'abc' } });
		});
	});
});
