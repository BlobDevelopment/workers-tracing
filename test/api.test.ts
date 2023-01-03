import { StatusCode } from 'src/tracing';
import { ATTRIBUTE_NAME } from 'src/utils/constants';
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';
import { UnstableDevWorker } from 'wrangler';
import { getTrace, requestAndGetTrace } from './utils/trace';
import { startCollector, startWorker } from './utils/worker';

let devWorker: UnstableDevWorker;
let collectorWorker: UnstableDevWorker;

const URL = 'http://worker/test';

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
		describe('Sanity checks', () => {
			test('Trace ID should be 32 hex chars', async () => {
				devWorker = await startWorker('test/scripts/api/root-span.ts');

				const res = await devWorker.fetch('http://worker/test');

				expect(res.status).toBe(200);
				expect(res.headers.get('x-trace-id')).not.toBeNull();

				const traceId = res.headers.get('x-trace-id');
				if (traceId === null) {
					expect(traceId).not.toBeNull();
					return;
				}
				const trace = await getTrace(collectorWorker, traceId);

				expect(trace.resourceSpans.length).toBe(1);
				const resourceSpan = trace.resourceSpans[0];

				expect(resourceSpan.scopeSpans.length).toBe(1);
				expect(resourceSpan.scopeSpans[0].scope.name).toBe('root-span');
				expect(resourceSpan.scopeSpans[0].spans.length).toBe(1);
				const span = resourceSpan.scopeSpans[0].spans[0];

				// Sanity check trace ID
				expect(span.traceId.length).toBe(32);
				expect(span.traceId).toMatch(/[a-f0-9]{32}/);
			});

			test('Span ID should be 16 hex chars', async () => {
				devWorker = await startWorker('test/scripts/api/root-span.ts');

				const res = await devWorker.fetch('http://worker/test');

				expect(res.status).toBe(200);
				expect(res.headers.get('x-trace-id')).not.toBeNull();

				const traceId = res.headers.get('x-trace-id');
				if (traceId === null) {
					expect(traceId).not.toBeNull();
					return;
				}
				const trace = await getTrace(collectorWorker, traceId);

				expect(trace.resourceSpans.length).toBe(1);
				const resourceSpan = trace.resourceSpans[0];

				expect(resourceSpan.scopeSpans.length).toBe(1);
				expect(resourceSpan.scopeSpans[0].scope.name).toBe('root-span');
				expect(resourceSpan.scopeSpans[0].spans.length).toBe(1);
				const span = resourceSpan.scopeSpans[0].spans[0];

				// Sanity check trace ID
				expect(span.spanId.length).toBe(16);
				expect(span.spanId).toMatch(/[a-f0-9]{16}/);
			});
		});

		describe('Root span', () => {
			test('Default root span', async () => {
				devWorker = await startWorker('test/scripts/api/root-span.ts');

				const res = await devWorker.fetch('http://worker/test');

				expect(res.status).toBe(200);
				expect(res.headers.get('x-trace-id')).not.toBeNull();

				const traceId = res.headers.get('x-trace-id');
				if (traceId === null) {
					expect(traceId).not.toBeNull();
					return;
				}
				const trace = await getTrace(collectorWorker, traceId);

				expect(trace.resourceSpans.length).toBe(1);
				const resourceSpan = trace.resourceSpans[0];
				const resource = resourceSpan.resource;

				// Validate default resource attributes
				expect(
					resource.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.SERVICE_NAME),
				).toStrictEqual({ key: ATTRIBUTE_NAME.SERVICE_NAME, value: { stringValue: 'root-span' } });
				expect(
					resource.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.SDK_NAME),
				).toStrictEqual({ key: ATTRIBUTE_NAME.SDK_NAME, value: { stringValue: 'workers-tracing' } });
				expect(
					resource.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.SDK_LANG),
				).toStrictEqual({ key: ATTRIBUTE_NAME.SDK_LANG, value: { stringValue: 'javascript' } });
				expect(
					resource.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.SDK_VERSION),
				).toStrictEqual({ key: ATTRIBUTE_NAME.SDK_VERSION, value: { stringValue: '__VERSION__' } });
				expect(
					resource.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.RUNTIME_NAME),
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
				if (traceId === null) {
					expect(traceId).not.toBeNull();
					return;
				}
				const trace = await getTrace(collectorWorker, traceId);

				expect(trace.resourceSpans.length).toBe(1);
				const resourceSpan = trace.resourceSpans[0];
				const resource = resourceSpan.resource;

				// Validate default resource attributes
				expect(
					resource.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.SERVICE_NAME),
				).toStrictEqual({ key: ATTRIBUTE_NAME.SERVICE_NAME, value: { stringValue: 'root-span-resource-attributes' } });
				expect(
					resource.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.SDK_NAME),
				).toStrictEqual({ key: ATTRIBUTE_NAME.SDK_NAME, value: { stringValue: 'workers-tracing' } });
				expect(
					resource.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.SDK_LANG),
				).toStrictEqual({ key: ATTRIBUTE_NAME.SDK_LANG, value: { stringValue: 'javascript' } });
				expect(
					resource.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.SDK_VERSION),
				).toStrictEqual({ key: ATTRIBUTE_NAME.SDK_VERSION, value: { stringValue: '__VERSION__' } });

				// Validate custom resource attributes
				expect(
					resource.attributes.find((attribute) => attribute.key === 'example'),
				).toStrictEqual({ key: 'example', value: { boolValue: true } });
				expect(
					resource.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.RUNTIME_NAME),
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
				if (traceId === null) {
					expect(traceId).not.toBeNull();
					return;
				}
				const trace = await getTrace(collectorWorker, traceId);

				expect(trace.resourceSpans.length).toBe(1);
				const resourceSpan = trace.resourceSpans[0];
				const resource = resourceSpan.resource;

				// Validate default resource attributes
				expect(
					resource.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.SERVICE_NAME),
				).toStrictEqual({ key: ATTRIBUTE_NAME.SERVICE_NAME, value: { stringValue: 'root-span-attributes' } });
				expect(
					resource.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.SDK_NAME),
				).toStrictEqual({ key: ATTRIBUTE_NAME.SDK_NAME, value: { stringValue: 'workers-tracing' } });
				expect(
					resource.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.SDK_LANG),
				).toStrictEqual({ key: ATTRIBUTE_NAME.SDK_LANG, value: { stringValue: 'javascript' } });
				expect(
					resource.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.SDK_VERSION),
				).toStrictEqual({ key: ATTRIBUTE_NAME.SDK_VERSION, value: { stringValue: '__VERSION__' } });
				expect(
					resource.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.RUNTIME_NAME),
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
					span.attributes.find((attribute) => attribute.key === 'customAttribute'),
				).toStrictEqual({ key: 'customAttribute', value: { intValue: 1337 } });
				expect(
					span.attributes.find((attribute) => attribute.key === 'workersTracing'),
				).toStrictEqual({ key: 'workersTracing', value: { boolValue: true } });
			});

			test('Root span with status', async () => {
				devWorker = await startWorker('test/scripts/api/root-span-status.ts');

				const res = await devWorker.fetch('http://worker/test');

				expect(res.status).toBe(200);
				expect(res.headers.get('x-trace-id')).not.toBeNull();

				const traceId = res.headers.get('x-trace-id');
				if (traceId === null) {
					expect(traceId).not.toBeNull();
					return;
				}
				const trace = await getTrace(collectorWorker, traceId);

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
				if (traceId === null) {
					expect(traceId).not.toBeNull();
					return;
				}
				const trace = await getTrace(collectorWorker, traceId);

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
				expect(span.events[0].timeUnixNano).not.toBe(0);
			});

			test('Root span with links', async () => {
				devWorker = await startWorker('test/scripts/api/root-span-links.ts');

				const res = await devWorker.fetch('http://worker/test');

				expect(res.status).toBe(200);
				expect(res.headers.get('x-trace-id')).not.toBeNull();

				const traceId = res.headers.get('x-trace-id');
				if (traceId === null) {
					expect(traceId).not.toBeNull();
					return;
				}
				const trace = await getTrace(collectorWorker, traceId);

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
							},
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

	describe('Default attributes', () => {
		test('Attributes are all set', async () => {
			devWorker = await startWorker('test/scripts/api/root-span.ts');

			const res = await devWorker.fetch('http://worker/test');

			expect(res.status).toBe(200);
			expect(res.headers.get('x-trace-id')).not.toBeNull();

			const traceId = res.headers.get('x-trace-id');
			if (traceId === null) {
				expect(traceId).not.toBeNull();
				return;
			}
			const trace = await getTrace(collectorWorker, traceId);

			expect(trace.resourceSpans.length).toBe(1);
			const resourceSpan = trace.resourceSpans[0];
			const resource = resourceSpan.resource;

			// Validate default attributes
			expect(
				resource.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.SERVICE_NAME),
			).toStrictEqual({ key: ATTRIBUTE_NAME.SERVICE_NAME, value: { stringValue: 'root-span' } });
			expect(
				resource.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.SDK_NAME),
			).toStrictEqual({ key: ATTRIBUTE_NAME.SDK_NAME, value: { stringValue: 'workers-tracing' } });
			expect(
				resource.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.SDK_LANG),
			).toStrictEqual({ key: ATTRIBUTE_NAME.SDK_LANG, value: { stringValue: 'javascript' } });
			expect(
				resource.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.SDK_VERSION),
			).toStrictEqual({ key: ATTRIBUTE_NAME.SDK_VERSION, value: { stringValue: '__VERSION__' } });
			expect(
				resource.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.RUNTIME_NAME),
			).toStrictEqual({ key: ATTRIBUTE_NAME.RUNTIME_NAME, value: { stringValue: 'Cloudflare-Workers' } });
		});

		test('Attributes work with no compat date', async () => {
			devWorker = await startWorker('test/scripts/api/root-span.ts', {
				// Set compat date to September 2021, this is the earliest compat date possible
				// and what it will default to if none is provided
				compatibilityDate: '2021-09-14',
			});

			const res = await devWorker.fetch('http://worker/test');

			expect(res.status).toBe(200);
			expect(res.headers.get('x-trace-id')).not.toBeNull();

			const traceId = res.headers.get('x-trace-id');
			if (traceId === null) {
				expect(traceId).not.toBeNull();
				return;
			}
			const trace = await getTrace(collectorWorker, traceId);

			expect(trace.resourceSpans.length).toBe(1);
			const resourceSpan = trace.resourceSpans[0];
			const resource = resourceSpan.resource;

			// Validate default attributes
			expect(
				resource.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.SERVICE_NAME),
			).toStrictEqual({ key: ATTRIBUTE_NAME.SERVICE_NAME, value: { stringValue: 'root-span' } });
			expect(
				resource.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.SDK_NAME),
			).toStrictEqual({ key: ATTRIBUTE_NAME.SDK_NAME, value: { stringValue: 'workers-tracing' } });
			expect(
				resource.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.SDK_LANG),
			).toStrictEqual({ key: ATTRIBUTE_NAME.SDK_LANG, value: { stringValue: 'javascript' } });
			expect(
				resource.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.SDK_VERSION),
			).toStrictEqual({ key: ATTRIBUTE_NAME.SDK_VERSION, value: { stringValue: '__VERSION__' } });
			expect(
				resource.attributes.find((attribute) => attribute.key === ATTRIBUTE_NAME.RUNTIME_NAME),
			).toStrictEqual({ key: ATTRIBUTE_NAME.RUNTIME_NAME, value: { stringValue: 'Unknown' } });
		});
	});

	describe('buildSpan', () => {
		test('Can build basic span', async () => {
			devWorker = await startWorker('test/scripts/api/span-builder/basic.ts');
			const trace = await requestAndGetTrace(devWorker, collectorWorker, URL);

			expect(trace.resourceSpans.length).toBe(1);
			const resourceSpan = trace.resourceSpans[0];

			// Check spans
			expect(resourceSpan.scopeSpans.length).toBe(1);
			expect(resourceSpan.scopeSpans[0].scope.name).toBe('span-builder-basic');
			expect(resourceSpan.scopeSpans[0].spans.length).toBe(2);
			const span = resourceSpan.scopeSpans[0].spans[0];

			// Validate root span
			expect(span.name).toBe('Request (fetch event)');
			expect(span.endTimeUnixNano).not.toBe(0);

			// Validate builder span
			const builderSpan = resourceSpan.scopeSpans[0].spans[1];
			expect(builderSpan.name).toBe('fetch');
			expect(builderSpan.startTimeUnixNano).not.toBe(0);
			expect(builderSpan.endTimeUnixNano).not.toBe(0);
			expect(builderSpan.endTimeUnixNano - builderSpan.startTimeUnixNano).not.toBe(0);
		});

		test('Can add attributes', async () => {
			devWorker = await startWorker('test/scripts/api/span-builder/attributes.ts');
			const trace = await requestAndGetTrace(devWorker, collectorWorker, URL);

			expect(trace.resourceSpans.length).toBe(1);
			const resourceSpan = trace.resourceSpans[0];

			// Check spans
			expect(resourceSpan.scopeSpans.length).toBe(1);
			expect(resourceSpan.scopeSpans[0].scope.name).toBe('span-builder-attributes');
			expect(resourceSpan.scopeSpans[0].spans.length).toBe(2);
			const span = resourceSpan.scopeSpans[0].spans[0];

			// Validate root span
			expect(span.name).toBe('Request (fetch event)');
			expect(span.endTimeUnixNano).not.toBe(0);

			// Validate builder span
			const builderSpan = resourceSpan.scopeSpans[0].spans[1];
			expect(builderSpan.name).toBe('fetch');
			expect(builderSpan.startTimeUnixNano).not.toBe(0);
			expect(builderSpan.endTimeUnixNano).not.toBe(0);
			expect(builderSpan.endTimeUnixNano - builderSpan.startTimeUnixNano).not.toBe(0);

			// Should have 8 attributes
			expect(builderSpan.attributes.length).toBe(8);

			// Single value attributes
			expect(builderSpan.attributes.find((attribute) => attribute.key === 'str'))
				.toStrictEqual({ key: 'str', value: { stringValue: 'example.com' } });
			expect(builderSpan.attributes.find((attribute) => attribute.key === 'int'))
				.toStrictEqual({ key: 'int', value: { intValue: 1337 } });
			expect(builderSpan.attributes.find((attribute) => attribute.key === 'double'))
				.toStrictEqual({ key: 'double', value: { doubleValue: 13.37 } });
			expect(builderSpan.attributes.find((attribute) => attribute.key === 'bool'))
				.toStrictEqual({ key: 'bool', value: { boolValue: true } });

			// Array attributes
			expect(builderSpan.attributes.find((attribute) => attribute.key === 'strArray'))
				.toStrictEqual({ key: 'strArray', value: {
					arrayValue: {
						values: [
							{ stringValue: 'a' },
							{ stringValue: 'b' },
							{ stringValue: 'c' },
						],
					},
				}});
			expect(builderSpan.attributes.find((attribute) => attribute.key === 'intArray'))
				.toStrictEqual({ key: 'intArray', value: {
					arrayValue: {
						values: [
							{ intValue: 1 },
							{ intValue: 2 },
							{ intValue: 3 },
						],
					},
				}});
			expect(builderSpan.attributes.find((attribute) => attribute.key === 'doubleArray'))
				.toStrictEqual({ key: 'doubleArray', value: {
					arrayValue: {
						values: [
							{ doubleValue: 1.1 },
							{ doubleValue: 2.2 },
							{ doubleValue: 3.3 },
						],
					},
				}});
			expect(builderSpan.attributes.find((attribute) => attribute.key === 'boolArray'))
				.toStrictEqual({ key: 'boolArray', value: {
					arrayValue: {
						values: [
							{ boolValue: true },
							{ boolValue: false },
							{ boolValue: true },
						],
					},
				}});
		});

		test('Can add attributes and remove', async () => {
			devWorker = await startWorker('test/scripts/api/span-builder/add-remove-attributes.ts');
			const trace = await requestAndGetTrace(devWorker, collectorWorker, URL);

			expect(trace.resourceSpans.length).toBe(1);
			const resourceSpan = trace.resourceSpans[0];

			// Check spans
			expect(resourceSpan.scopeSpans.length).toBe(1);
			expect(resourceSpan.scopeSpans[0].scope.name).toBe('span-builder-add-remove-attributes');
			expect(resourceSpan.scopeSpans[0].spans.length).toBe(2);
			const span = resourceSpan.scopeSpans[0].spans[0];

			// Validate root span
			expect(span.name).toBe('Request (fetch event)');
			expect(span.endTimeUnixNano).not.toBe(0);

			// Validate builder span
			const builderSpan = resourceSpan.scopeSpans[0].spans[1];
			expect(builderSpan.name).toBe('fetch');
			expect(builderSpan.startTimeUnixNano).not.toBe(0);
			expect(builderSpan.endTimeUnixNano).not.toBe(0);
			expect(builderSpan.endTimeUnixNano - builderSpan.startTimeUnixNano).not.toBe(0);

			// "str" was removed, we should only have 1 left
			expect(builderSpan.attributes.length).toBe(1);
			expect(builderSpan.attributes.find((attribute) => attribute.key === 'int'))
				.toStrictEqual({ key: 'int', value: { intValue: 1337 } });
		});

		test('Can set status', async () => {
			devWorker = await startWorker('test/scripts/api/span-builder/status.ts');
			const trace = await requestAndGetTrace(devWorker, collectorWorker, URL);

			expect(trace.resourceSpans.length).toBe(1);
			const resourceSpan = trace.resourceSpans[0];

			// Check spans
			expect(resourceSpan.scopeSpans.length).toBe(1);
			expect(resourceSpan.scopeSpans[0].scope.name).toBe('span-builder-status');
			expect(resourceSpan.scopeSpans[0].spans.length).toBe(2);
			const span = resourceSpan.scopeSpans[0].spans[0];

			// Validate root span
			expect(span.name).toBe('Request (fetch event)');
			expect(span.endTimeUnixNano).not.toBe(0);

			// Validate builder span
			const builderSpan = resourceSpan.scopeSpans[0].spans[1];
			expect(builderSpan.name).toBe('fetch');
			expect(builderSpan.startTimeUnixNano).not.toBe(0);
			expect(builderSpan.endTimeUnixNano).not.toBe(0);
			expect(builderSpan.endTimeUnixNano - builderSpan.startTimeUnixNano).not.toBe(0);

			// Validate status
			expect(builderSpan.status).toStrictEqual({ code: StatusCode.OK });
		});

		test('Can add event', async () => {
			devWorker = await startWorker('test/scripts/api/span-builder/event.ts');
			const trace = await requestAndGetTrace(devWorker, collectorWorker, URL);

			expect(trace.resourceSpans.length).toBe(1);
			const resourceSpan = trace.resourceSpans[0];

			// Check spans
			expect(resourceSpan.scopeSpans.length).toBe(1);
			expect(resourceSpan.scopeSpans[0].scope.name).toBe('span-builder-event');
			expect(resourceSpan.scopeSpans[0].spans.length).toBe(2);
			const span = resourceSpan.scopeSpans[0].spans[0];

			// Validate root span
			expect(span.name).toBe('Request (fetch event)');
			expect(span.endTimeUnixNano).not.toBe(0);

			// Validate builder span
			const builderSpan = resourceSpan.scopeSpans[0].spans[1];
			expect(builderSpan.name).toBe('fetch');
			expect(builderSpan.startTimeUnixNano).not.toBe(0);
			expect(builderSpan.endTimeUnixNano).not.toBe(0);
			expect(builderSpan.endTimeUnixNano - builderSpan.startTimeUnixNano).not.toBe(0);

			// Validate events
			expect(builderSpan.events.length).toBe(2);
			
			expect(builderSpan.events[0].name).toBe('Span started');
			expect(builderSpan.events[0].attributes.length).toBe(0);
			expect(builderSpan.events[0].timeUnixNano).not.toBe(0);
			
			expect(builderSpan.events[1].name).toBe('Fetch done');
			expect(builderSpan.events[1].attributes.length).toBe(1);
			expect(builderSpan.events[1].attributes[0])
				.toStrictEqual({ key: 'host', value: { stringValue: 'example.com' } });
			expect(builderSpan.events[1].timeUnixNano).not.toBe(0);
		});

		test('Can add links', async () => {
			devWorker = await startWorker('test/scripts/api/span-builder/links.ts');
			const trace = await requestAndGetTrace(devWorker, collectorWorker, URL);

			expect(trace.resourceSpans.length).toBe(1);
			const resourceSpan = trace.resourceSpans[0];

			// Check spans
			expect(resourceSpan.scopeSpans.length).toBe(1);
			expect(resourceSpan.scopeSpans[0].scope.name).toBe('span-builder-links');
			expect(resourceSpan.scopeSpans[0].spans.length).toBe(2);
			const span = resourceSpan.scopeSpans[0].spans[0];

			// Validate root span
			expect(span.name).toBe('Request (fetch event)');
			expect(span.endTimeUnixNano).not.toBe(0);

			// Validate builder span
			const builderSpan = resourceSpan.scopeSpans[0].spans[1];
			expect(builderSpan.name).toBe('fetch');
			expect(builderSpan.startTimeUnixNano).not.toBe(0);
			expect(builderSpan.endTimeUnixNano).not.toBe(0);
			expect(builderSpan.endTimeUnixNano - builderSpan.startTimeUnixNano).not.toBe(0);

			// Validate links
			expect(builderSpan.links.length).toBe(2);

			expect(builderSpan.links[0].traceId).toBe(span.traceId);
			expect(builderSpan.links[0].spanId).toBe(span.spanId);
			expect(builderSpan.links[0].attributes.length).toBe(0);

			expect(builderSpan.links[1].traceId).toBe('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
			expect(builderSpan.links[1].spanId).toBe('aaaaaaaaaaaaaaaa');
			expect(builderSpan.links[1].attributes.length).toBe(1);
			expect(builderSpan.links[1].attributes[0])
				.toStrictEqual({ key: 'service', value: { stringValue: 'example' } });
		});
	});
});
