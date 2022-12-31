import { ZipkinJson } from 'src/transformers/zipkin';
import { ATTRIBUTE_NAME, SPAN_NAME } from 'src/utils/constants';
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';
import { UnstableDevWorker } from 'wrangler';
import { getTrace } from './utils/trace';
import { startCollector, startWorker } from './utils/worker';

let devWorker: UnstableDevWorker;
let collectorWorker: UnstableDevWorker;

describe('Test Zipkin Exporter', () => {
	beforeAll(async () => {
		collectorWorker = await startCollector({ port: 9411 });
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
		devWorker = await startWorker('test/scripts/zipkin/basic.ts');

		const res = await devWorker.fetch('http://worker/test');

		expect(res.status).toBe(200);
		expect(res.headers.get('x-trace-id')).not.toBeNull();

		const traceId = res.headers.get('x-trace-id');
		if (traceId === null) {
			expect(traceId).not.toBeNull();
			return;
		}
		const trace = await getTrace<ZipkinJson>(collectorWorker, traceId);

		const span = trace[0];
		expect(span.traceId).toBe(traceId);
		expect(span.name).toBe('Request (fetch event)');
		expect(span.localEndpoint.serviceName).toBe('zipkin-basic');
	});

	describe('Root span', () => {
		test('Default attributes are put on root span', async () => {
			devWorker = await startWorker('test/scripts/zipkin/basic.ts');

			const res = await devWorker.fetch('http://worker/test');

			expect(res.status).toBe(200);
			expect(res.headers.get('x-trace-id')).not.toBeNull();

			const traceId = res.headers.get('x-trace-id');
			if (traceId === null) {
				expect(traceId).not.toBeNull();
				return;
			}
			const trace = await getTrace<ZipkinJson>(collectorWorker, traceId);

			const span = trace[0];
			expect(span.traceId).toBe(traceId);
			expect(span.name).toBe('Request (fetch event)');
			expect(span.localEndpoint.serviceName).toBe('zipkin-basic');

			// Check attributes
			expect(span.tags?.[ATTRIBUTE_NAME.SERVICE_NAME]).toBe('zipkin-basic');
			expect(span.tags?.[ATTRIBUTE_NAME.SDK_NAME]).toBe('workers-tracing');
			expect(span.tags?.[ATTRIBUTE_NAME.SDK_LANG]).toBe('javascript');
			expect(span.tags?.[ATTRIBUTE_NAME.SDK_VERSION]).toBe('__VERSION__');
			expect(span.tags?.[ATTRIBUTE_NAME.RUNTIME_NAME]).toBe('Cloudflare-Workers');
		});

		test('You can add attributes on resource', async () => {
			devWorker = await startWorker('test/scripts/zipkin/resource-attributes.ts');

			const res = await devWorker.fetch('http://worker/test');

			expect(res.status).toBe(200);
			expect(res.headers.get('x-trace-id')).not.toBeNull();

			const traceId = res.headers.get('x-trace-id');
			if (traceId === null) {
				expect(traceId).not.toBeNull();
				return;
			}
			const trace = await getTrace<ZipkinJson>(collectorWorker, traceId);

			const span = trace[0];
			expect(span.traceId).toBe(traceId);
			expect(span.name).toBe('Request (fetch event)');
			expect(span.localEndpoint.serviceName).toBe('resource-attributes');

			// Check attributes
			expect(span.tags?.[ATTRIBUTE_NAME.SERVICE_NAME]).toBe('resource-attributes');
			expect(span.tags?.[ATTRIBUTE_NAME.SDK_NAME]).toBe('workers-tracing');
			expect(span.tags?.[ATTRIBUTE_NAME.SDK_LANG]).toBe('javascript');
			expect(span.tags?.[ATTRIBUTE_NAME.SDK_VERSION]).toBe('__VERSION__');
			
			// Custom attributes
			expect(span.tags?.['exampleAttribute']).toBe('true');
			expect(span.tags?.[ATTRIBUTE_NAME.RUNTIME_NAME]).toBe('blob-runtime');
		});
	});

	describe('Single span', () => {
		test('You can add a single span', async () => {
			devWorker = await startWorker('test/scripts/zipkin/single-span.ts');

			const res = await devWorker.fetch('http://worker/test');

			expect(res.status).toBe(200);
			expect(res.headers.get('x-trace-id')).not.toBeNull();

			const traceId = res.headers.get('x-trace-id');
			if (traceId === null) {
				expect(traceId).not.toBeNull();
				return;
			}
			const trace = await getTrace<ZipkinJson>(collectorWorker, traceId);

			// Root + child
			expect(trace.length).toBe(2);

			// Root span
			const rootSpan = trace[0];
			expect(rootSpan.traceId).toBe(traceId);
			expect(rootSpan.name).toBe('Request (fetch event)');
			expect(rootSpan.localEndpoint.serviceName).toBe('single-span');

			// Child span
			const childSpan = trace[1];
			expect(childSpan.traceId).toBe(traceId);
			expect(childSpan.parentId).toBe(rootSpan.id);
			expect(childSpan.name).toBe(SPAN_NAME.FETCH);
			expect(childSpan.duration).not.toBe(0);
		});

		test('You can add a single span with attributes', async () => {
			devWorker = await startWorker('test/scripts/zipkin/single-span-attributes.ts');

			const res = await devWorker.fetch('http://worker/test');

			expect(res.status).toBe(200);
			expect(res.headers.get('x-trace-id')).not.toBeNull();

			const traceId = res.headers.get('x-trace-id');
			if (traceId === null) {
				expect(traceId).not.toBeNull();
				return;
			}
			const trace = await getTrace<ZipkinJson>(collectorWorker, traceId);

			// Root + child
			expect(trace.length).toBe(2);

			// Root span
			const rootSpan = trace[0];
			expect(rootSpan.traceId).toBe(traceId);
			expect(rootSpan.name).toBe('Request (fetch event)');
			expect(rootSpan.localEndpoint.serviceName).toBe('single-span-attributes');

			// Child span
			const childSpan = trace[1];
			expect(childSpan.traceId).toBe(traceId);
			expect(childSpan.parentId).toBe(rootSpan.id);
			expect(childSpan.name).toBe(SPAN_NAME.FETCH);
			expect(childSpan.duration).not.toBe(0);
			expect(childSpan.tags?.[ATTRIBUTE_NAME.HTTP_HOST]).toBe('example.com');
		});

		test('You can add a single span with events', async () => {
			devWorker = await startWorker('test/scripts/zipkin/single-span-events.ts');

			const res = await devWorker.fetch('http://worker/test');

			expect(res.status).toBe(200);
			expect(res.headers.get('x-trace-id')).not.toBeNull();

			const traceId = res.headers.get('x-trace-id');
			if (traceId === null) {
				expect(traceId).not.toBeNull();
				return;
			}
			const trace = await getTrace<ZipkinJson>(collectorWorker, traceId);

			// Root + child
			expect(trace.length).toBe(2);

			// Root span
			const rootSpan = trace[0];
			expect(rootSpan.traceId).toBe(traceId);
			expect(rootSpan.name).toBe('Request (fetch event)');
			expect(rootSpan.localEndpoint.serviceName).toBe('single-span-events');

			// Child span
			const childSpan = trace[1];
			expect(childSpan.traceId).toBe(traceId);
			expect(childSpan.parentId).toBe(rootSpan.id);
			expect(childSpan.name).toBe(SPAN_NAME.FETCH);
			expect(childSpan.duration).not.toBe(0);

			// Annotations (events)
			expect(childSpan.annotations?.length).toBe(2);
			expect(childSpan.annotations?.[0].value).toBe('Fetch done');
			expect(childSpan.annotations?.[0].timestamp).not.toBe(0);
			expect(childSpan.annotations?.[1].value).toBe('Response body parsed');
			expect(childSpan.annotations?.[1].timestamp).not.toBe(0);
		});

		test('You can add a single span with attributes and events', async () => {
			devWorker = await startWorker('test/scripts/zipkin/single-span-attributes-and-events.ts');

			const res = await devWorker.fetch('http://worker/test');

			expect(res.status).toBe(200);
			expect(res.headers.get('x-trace-id')).not.toBeNull();

			const traceId = res.headers.get('x-trace-id');
			if (traceId === null) {
				expect(traceId).not.toBeNull();
				return;
			}
			const trace = await getTrace<ZipkinJson>(collectorWorker, traceId);

			// Root + child
			expect(trace.length).toBe(2);

			// Root span
			const rootSpan = trace[0];
			expect(rootSpan.traceId).toBe(traceId);
			expect(rootSpan.name).toBe('Request (fetch event)');
			expect(rootSpan.localEndpoint.serviceName).toBe('single-span-attributes-and-events');

			// Child span
			const childSpan = trace[1];
			expect(childSpan.traceId).toBe(traceId);
			expect(childSpan.parentId).toBe(rootSpan.id);
			expect(childSpan.name).toBe(SPAN_NAME.FETCH);
			expect(childSpan.duration).not.toBe(0);
			expect(childSpan.tags?.[ATTRIBUTE_NAME.HTTP_HOST]).toBe('example.com');

			// Annotations (events)
			expect(childSpan.annotations?.length).toBe(2);
			expect(childSpan.annotations?.[0].value).toBe('Fetch done');
			expect(childSpan.annotations?.[0].timestamp).not.toBe(0);
			expect(childSpan.annotations?.[1].value).toBe('Response body parsed');
			expect(childSpan.annotations?.[1].timestamp).not.toBe(0);
		});
	});

	describe('Multiple spans', () => {
		test('You can add multiple spans', async () => {
			devWorker = await startWorker('test/scripts/zipkin/multiple-spans.ts', {
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
			const trace = await getTrace<ZipkinJson>(collectorWorker, traceId);

			// Root + 2 children
			expect(trace.length).toBe(3);

			// Root span
			const rootSpan = trace[0];
			expect(rootSpan.traceId).toBe(traceId);
			expect(rootSpan.name).toBe('Request (fetch event)');
			expect(rootSpan.localEndpoint.serviceName).toBe('multiple-spans');

			// First child span
			const firstChildSpan = trace[1];
			expect(firstChildSpan.traceId).toBe(traceId);
			expect(firstChildSpan.parentId).toBe(rootSpan.id);
			expect(firstChildSpan.name).toBe(SPAN_NAME.FETCH);
			expect(firstChildSpan.duration).not.toBe(0);

			// Second child span
			const secondChildSpan = trace[2];
			expect(secondChildSpan.traceId).toBe(traceId);
			expect(secondChildSpan.parentId).toBe(rootSpan.id);
			expect(secondChildSpan.name).toBe(SPAN_NAME.KV_GET);
			expect(secondChildSpan.duration).not.toBe(0);
		});

		test('You can add multiple spans with attributes', async () => {
			devWorker = await startWorker('test/scripts/zipkin/multiple-spans-attributes.ts', {
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
			const trace = await getTrace<ZipkinJson>(collectorWorker, traceId);

			// Root + 2 children
			expect(trace.length).toBe(3);

			// Root span
			const rootSpan = trace[0];
			expect(rootSpan.traceId).toBe(traceId);
			expect(rootSpan.name).toBe('Request (fetch event)');
			expect(rootSpan.localEndpoint.serviceName).toBe('multiple-spans-attributes');

			// First child span
			const firstChildSpan = trace[1];
			expect(firstChildSpan.traceId).toBe(traceId);
			expect(firstChildSpan.parentId).toBe(rootSpan.id);
			expect(firstChildSpan.name).toBe(SPAN_NAME.FETCH);
			expect(firstChildSpan.duration).not.toBe(0);
			expect(firstChildSpan.tags?.[ATTRIBUTE_NAME.HTTP_HOST]).toBe('example.com');

			// Second child span
			const secondChildSpan = trace[2];
			expect(secondChildSpan.traceId).toBe(traceId);
			expect(secondChildSpan.parentId).toBe(rootSpan.id);
			expect(secondChildSpan.name).toBe(SPAN_NAME.KV_GET);
			expect(secondChildSpan.duration).not.toBe(0);
			expect(secondChildSpan.tags?.[ATTRIBUTE_NAME.KV_KEY]).toBe('abc');
		});

		test('You can add multiple spans with events', async () => {
			devWorker = await startWorker('test/scripts/zipkin/multiple-spans-events.ts', {
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
			const trace = await getTrace<ZipkinJson>(collectorWorker, traceId);

			// Root + 2 children
			expect(trace.length).toBe(3);

			// Root span
			const rootSpan = trace[0];
			expect(rootSpan.traceId).toBe(traceId);
			expect(rootSpan.name).toBe('Request (fetch event)');
			expect(rootSpan.localEndpoint.serviceName).toBe('multiple-spans-events');

			// First child span
			const firstChildSpan = trace[1];
			expect(firstChildSpan.traceId).toBe(traceId);
			expect(firstChildSpan.parentId).toBe(rootSpan.id);
			expect(firstChildSpan.name).toBe(SPAN_NAME.FETCH);
			expect(firstChildSpan.duration).not.toBe(0);

			// - Annotations (events)
			expect(firstChildSpan.annotations?.length).toBe(2);
			expect(firstChildSpan.annotations?.[0].value).toBe('Fetch done');
			expect(firstChildSpan.annotations?.[0].timestamp).not.toBe(0);
			expect(firstChildSpan.annotations?.[1].value).toBe('Response body parsed');
			expect(firstChildSpan.annotations?.[1].timestamp).not.toBe(0);

			// Second child span
			const secondChildSpan = trace[2];
			expect(secondChildSpan.traceId).toBe(traceId);
			expect(secondChildSpan.parentId).toBe(rootSpan.id);
			expect(secondChildSpan.name).toBe(SPAN_NAME.KV_GET);
			expect(secondChildSpan.duration).not.toBe(0);

			// - Annotations (events)
			expect(secondChildSpan.annotations?.length).toBe(1);
			expect(secondChildSpan.annotations?.[0].value).toBe('KV get done');
			expect(secondChildSpan.annotations?.[0].timestamp).not.toBe(0);
		});

		test('You can add multiple spans with attributes and events', async () => {
			devWorker = await startWorker('test/scripts/zipkin/multiple-spans-attributes-and-events.ts', {
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
			const trace = await getTrace<ZipkinJson>(collectorWorker, traceId);

			// Root + 2 children
			expect(trace.length).toBe(3);

			// Root span
			const rootSpan = trace[0];
			expect(rootSpan.traceId).toBe(traceId);
			expect(rootSpan.name).toBe('Request (fetch event)');
			expect(rootSpan.localEndpoint.serviceName).toBe('multiple-spans-attributes-and-events');

			// First child span
			const firstChildSpan = trace[1];
			expect(firstChildSpan.traceId).toBe(traceId);
			expect(firstChildSpan.parentId).toBe(rootSpan.id);
			expect(firstChildSpan.name).toBe(SPAN_NAME.FETCH);
			expect(firstChildSpan.duration).not.toBe(0);
			expect(firstChildSpan.tags?.[ATTRIBUTE_NAME.HTTP_HOST]).toBe('example.com');

			// - Annotations (events)
			expect(firstChildSpan.annotations?.length).toBe(2);
			expect(firstChildSpan.annotations?.[0].value).toBe('Fetch done');
			expect(firstChildSpan.annotations?.[0].timestamp).not.toBe(0);
			expect(firstChildSpan.annotations?.[1].value).toBe('Response body parsed');
			expect(firstChildSpan.annotations?.[1].timestamp).not.toBe(0);

			// Second child span
			const secondChildSpan = trace[2];
			expect(secondChildSpan.traceId).toBe(traceId);
			expect(secondChildSpan.parentId).toBe(rootSpan.id);
			expect(secondChildSpan.name).toBe(SPAN_NAME.KV_GET);
			expect(secondChildSpan.duration).not.toBe(0);
			expect(secondChildSpan.tags?.[ATTRIBUTE_NAME.KV_KEY]).toBe('abc');

			// - Annotations (events)
			expect(secondChildSpan.annotations?.length).toBe(1);
			expect(secondChildSpan.annotations?.[0].value).toBe('KV get done');
			expect(secondChildSpan.annotations?.[0].timestamp).not.toBe(0);
		});
	});

	describe('Child of child span', () => {
		test('You can add a child to a child span', async () => {
			devWorker = await startWorker('test/scripts/zipkin/span-span.ts', {
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
			const trace = await getTrace<ZipkinJson>(collectorWorker, traceId);

			// Root + 2 children
			expect(trace.length).toBe(3);

			// Root span
			const rootSpan = trace[0];
			expect(rootSpan.traceId).toBe(traceId);
			expect(rootSpan.name).toBe('Request (fetch event)');
			expect(rootSpan.localEndpoint.serviceName).toBe('span-span');

			// First child span
			const firstChildSpan = trace[1];
			expect(firstChildSpan.traceId).toBe(traceId);
			expect(firstChildSpan.parentId).toBe(rootSpan.id);
			expect(firstChildSpan.name).toBe(SPAN_NAME.FETCH);
			expect(firstChildSpan.duration).not.toBe(0);

			// Second child span
			const secondChildSpan = trace[2];
			expect(secondChildSpan.traceId).toBe(traceId);
			// Validate this is a child of the first child
			expect(secondChildSpan.parentId).toBe(firstChildSpan.id);
			expect(secondChildSpan.name).toBe(SPAN_NAME.KV_GET);
			expect(secondChildSpan.duration).not.toBe(0);
		});

		test('You can add a child to a child span with attributes', async () => {
			devWorker = await startWorker('test/scripts/zipkin/span-span-attributes.ts', {
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
			const trace = await getTrace<ZipkinJson>(collectorWorker, traceId);

			// Root + 2 children
			expect(trace.length).toBe(3);

			// Root span
			const rootSpan = trace[0];
			expect(rootSpan.traceId).toBe(traceId);
			expect(rootSpan.name).toBe('Request (fetch event)');
			expect(rootSpan.localEndpoint.serviceName).toBe('span-span-attributes');

			// First child span
			const firstChildSpan = trace[1];
			expect(firstChildSpan.traceId).toBe(traceId);
			expect(firstChildSpan.parentId).toBe(rootSpan.id);
			expect(firstChildSpan.name).toBe(SPAN_NAME.FETCH);
			expect(firstChildSpan.duration).not.toBe(0);
			expect(firstChildSpan.tags?.[ATTRIBUTE_NAME.HTTP_HOST]).toBe('example.com');

			// Second child span
			const secondChildSpan = trace[2];
			expect(secondChildSpan.traceId).toBe(traceId);
			// Validate this is a child of the first child
			expect(secondChildSpan.parentId).toBe(firstChildSpan.id);
			expect(secondChildSpan.name).toBe(SPAN_NAME.KV_GET);
			expect(secondChildSpan.duration).not.toBe(0);
			expect(secondChildSpan.tags?.[ATTRIBUTE_NAME.KV_KEY]).toBe('abc');
		});

		test('You can add a child to a child span with events', async () => {
			devWorker = await startWorker('test/scripts/zipkin/span-span-events.ts', {
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
			const trace = await getTrace<ZipkinJson>(collectorWorker, traceId);

			// Root + 2 children
			expect(trace.length).toBe(3);

			// Root span
			const rootSpan = trace[0];
			expect(rootSpan.traceId).toBe(traceId);
			expect(rootSpan.name).toBe('Request (fetch event)');
			expect(rootSpan.localEndpoint.serviceName).toBe('span-span-events');

			// First child span
			const firstChildSpan = trace[1];
			expect(firstChildSpan.traceId).toBe(traceId);
			expect(firstChildSpan.parentId).toBe(rootSpan.id);
			expect(firstChildSpan.name).toBe(SPAN_NAME.FETCH);
			expect(firstChildSpan.duration).not.toBe(0);

			// - Annotations (events)
			expect(firstChildSpan.annotations?.length).toBe(2);
			expect(firstChildSpan.annotations?.[0].value).toBe('Fetch done');
			expect(firstChildSpan.annotations?.[0].timestamp).not.toBe(0);
			expect(firstChildSpan.annotations?.[1].value).toBe('Response body parsed');
			expect(firstChildSpan.annotations?.[1].timestamp).not.toBe(0);

			// Second child span
			const secondChildSpan = trace[2];
			expect(secondChildSpan.traceId).toBe(traceId);
			// Validate this is a child of the first child
			expect(secondChildSpan.parentId).toBe(firstChildSpan.id);
			expect(secondChildSpan.name).toBe(SPAN_NAME.KV_GET);
			expect(secondChildSpan.duration).not.toBe(0);

			// - Annotations (events)
			expect(secondChildSpan.annotations?.length).toBe(1);
			expect(secondChildSpan.annotations?.[0].value).toBe('KV get done');
			expect(secondChildSpan.annotations?.[0].timestamp).not.toBe(0);
		});

		test('You can add a child to a child span with attributes and events', async () => {
			devWorker = await startWorker('test/scripts/zipkin/span-span-attributes-and-events.ts', {
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
			const trace = await getTrace<ZipkinJson>(collectorWorker, traceId);

			// Root + 2 children
			expect(trace.length).toBe(3);

			// Root span
			const rootSpan = trace[0];
			expect(rootSpan.traceId).toBe(traceId);
			expect(rootSpan.name).toBe('Request (fetch event)');
			expect(rootSpan.localEndpoint.serviceName).toBe('span-span-attributes-and-events');

			// First child span
			const firstChildSpan = trace[1];
			expect(firstChildSpan.traceId).toBe(traceId);
			expect(firstChildSpan.parentId).toBe(rootSpan.id);
			expect(firstChildSpan.name).toBe(SPAN_NAME.FETCH);
			expect(firstChildSpan.duration).not.toBe(0);
			expect(firstChildSpan.tags?.[ATTRIBUTE_NAME.HTTP_HOST]).toBe('example.com');

			// - Annotations (events)
			expect(firstChildSpan.annotations?.length).toBe(2);
			expect(firstChildSpan.annotations?.[0].value).toBe('Fetch done');
			expect(firstChildSpan.annotations?.[0].timestamp).not.toBe(0);
			expect(firstChildSpan.annotations?.[1].value).toBe('Response body parsed');
			expect(firstChildSpan.annotations?.[1].timestamp).not.toBe(0);

			// Second child span
			const secondChildSpan = trace[2];
			expect(secondChildSpan.traceId).toBe(traceId);
			// Validate this is a child of the first child
			expect(secondChildSpan.parentId).toBe(firstChildSpan.id);
			expect(secondChildSpan.name).toBe(SPAN_NAME.KV_GET);
			expect(secondChildSpan.duration).not.toBe(0);
			expect(secondChildSpan.tags?.[ATTRIBUTE_NAME.KV_KEY]).toBe('abc');

			// - Annotations (events)
			expect(secondChildSpan.annotations?.length).toBe(1);
			expect(secondChildSpan.annotations?.[0].value).toBe('KV get done');
			expect(secondChildSpan.annotations?.[0].timestamp).not.toBe(0);
		});
	});
});
