import { createTrace } from 'src/trace';

interface Env {}

export default {
	async fetch(req: Request, env: Env, ctx: ExecutionContext) {
		const trace = createTrace(req, env, ctx, {
			serviceName: 'span-builder-basic',
			collector: {
				url: 'http://0.0.0.0:4318/v1/traces',
			},
		});

		const span = trace.buildSpan('fetch');

		await fetch('https://example.com');

		span.end();
		await trace.send();
		return new Response('ok', { headers: { 'x-trace-id': trace.getTraceId() } });
	},
};
