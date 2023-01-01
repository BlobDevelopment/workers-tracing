import { createTrace } from 'src/trace';
import { OtlpTransformer } from 'src/transformers/otlp';
import { ATTRIBUTE_NAME, SPAN_NAME } from 'src/utils/constants';

interface Env {
	KV: KVNamespace;
}

export default {
	async fetch(req: Request, env: Env, ctx: ExecutionContext) {
		const trace = createTrace(req, env, ctx, {
			serviceName: 'span-span-attributes-and-events',
			collector: {
				url: 'http://0.0.0.0:4318/v1/traces', // OTLP compatible Jaeger endpoint
				transformer: new OtlpTransformer(),
			},
		});

		const fetchSpan = trace.startSpan(SPAN_NAME.FETCH, {
			attributes: { [ATTRIBUTE_NAME.HTTP_HOST]: 'example.com' },
		});

		const res = await fetch('https://example.com');
		fetchSpan.addEvent({
			name: 'Fetch done',
			timestamp: Date.now(),
			attributes: {
				[ATTRIBUTE_NAME.HTTP_HOST]: 'example.com',
			},
		});

		await res.text();
		fetchSpan.addEvent({
			name: 'Response body parsed',
			timestamp: Date.now(),
			attributes: {
				parsed: 'text',
			},
		});

		const kvSpan = fetchSpan.startSpan(SPAN_NAME.KV_GET, {
			attributes: { [ATTRIBUTE_NAME.KV_KEY]: 'abc' },
		});

		await env.KV.get('abc');
		kvSpan.addEvent({
			name: 'KV get done',
			timestamp: Date.now(),
			attributes: {
				[ATTRIBUTE_NAME.KV_KEY]: 'abc',
			},
		});
		kvSpan.end();
		fetchSpan.end();

		await trace.send();
		return new Response('ok', { headers: { 'x-trace-id': trace.getTraceId() } });
	},
};
