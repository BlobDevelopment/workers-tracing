import { createTrace } from 'src/trace';
import { ZipkinTransformer } from 'src/transformers/zipkin';
import { SPAN_NAME } from 'src/utils/constants';

interface Env {}

export default {
	async fetch(req: Request, env: Env, ctx: ExecutionContext) {
		const trace = createTrace(req, env, ctx, {
			serviceName: 'single-span-events',
			collector: {
				url: 'http://0.0.0.0:9411/api/v2/spans', // Zipkin compatible Jaeger endpoint
				transformer: new ZipkinTransformer(),
			},
		});

		const span = trace.startSpan(SPAN_NAME.FETCH);

		const res = await fetch('https://example.com');
		span.addEvent({ name: 'Fetch done', timestamp: Date.now() });

		await res.text();
		span.addEvent({ name: 'Response body parsed', timestamp: Date.now() });

		span.end();
		await trace.send();
		return new Response('ok', { headers: { 'x-trace-id': trace.getTraceId() } });
	},
};
