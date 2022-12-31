import { createTrace } from 'src/trace';

interface Env {}

export default {
	async fetch(req: Request, env: Env, ctx: ExecutionContext) {
		const trace = createTrace(req, env, ctx, {
			serviceName: 'root-span-attributes',
			collector: {
				url: 'http://0.0.0.0:4318/v1/traces',
			},
		}, {
			attributes: {
				customAttribute: 1337,
				workersTracing: true,
			},
		});

		await trace.send();
		return new Response('ok', { headers: { 'x-trace-id': trace.getTraceId() } });
	},
};
