import { createTrace } from 'src/trace';
import { StatusCode } from 'src/tracing';

interface Env {}

export default {
	async fetch(req: Request, env: Env, ctx: ExecutionContext) {
		const trace = createTrace(req, env, ctx, {
			serviceName: 'root-span-status',
			collector: {
				url: 'http://0.0.0.0:4318/v1/traces',
			},
		});

		trace.setStatus(StatusCode.OK);
		await trace.send();
		return new Response('ok', { headers: { 'x-trace-id': trace.getTraceId() } });
	},
};
