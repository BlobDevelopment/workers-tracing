import { createTrace } from 'src/trace';
import { ZipkinTransformer } from 'src/transformers/zipkin';
import { SPAN_NAME } from 'src/utils/constants';

interface Env {
	KV: KVNamespace;
}

export default {
	async fetch(req: Request, env: Env, ctx: ExecutionContext) {
		const trace = createTrace(req, env, ctx, {
			serviceName: 'span-span-events',
			collector: {
				url: 'http://0.0.0.0:9411/api/v2/spans', // Zipkin compatible Jaeger endpoint
				transformer: new ZipkinTransformer(),
			},
		});

		const fetchSpan = trace.startSpan(SPAN_NAME.FETCH);

		const res = await fetch('https://example.com');
		fetchSpan.addEvent({ name: 'Fetch done', timestamp: Date.now() });

		await res.text();
		fetchSpan.addEvent({ name: 'Response body parsed', timestamp: Date.now() });

		const kvSpan = fetchSpan.startSpan(SPAN_NAME.KV_GET);
		await env.KV.get('abc');
		kvSpan.addEvent({ name: 'KV get done', timestamp: Date.now() });
		kvSpan.end();
		fetchSpan.end();

		await trace.send();
		return new Response('ok', { headers: { 'x-trace-id': trace.getTraceId() } });
	},
};
