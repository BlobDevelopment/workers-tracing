import { createTrace } from 'src/trace';
import { ZipkinTransformer } from 'src/transformers/zipkin';
import { SPAN_NAME } from 'src/utils/constants';

interface Env {}

export default {
	async fetch(req: Request, env: Env, ctx: ExecutionContext) {
		const trace = createTrace(req, env, ctx, {
			serviceName: 'single-span',
			collector: {
				url: 'http://0.0.0.0:9411/api/v2/spans', // Zipkin compatible Jaeger endpoint
				transformer: new ZipkinTransformer(),
			},
		});

		await trace.trace(SPAN_NAME.FETCH, () => fetch('https://example.com'));

		await trace.send();
		return new Response('ok', { headers: { 'x-trace-id': trace.getTraceId() } });
	},
};
