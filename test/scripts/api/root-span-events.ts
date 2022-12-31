import { createTrace } from 'src/trace';

interface Env {}

export default {
	async fetch(req: Request, env: Env, ctx: ExecutionContext) {
		const trace = createTrace(req, env, ctx, {
			serviceName: 'root-span-events',
			collector: {
				url: 'http://0.0.0.0:4318/v1/traces',
			},
		});

		await fetch('https://example.com');
		trace.addEvent({ name: 'Fetch done', timestamp: Date.now() });

		await trace.send();
		return new Response('ok', { headers: { 'x-trace-id': trace.getTraceId() } });
	},
};
