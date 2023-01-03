import { createTrace } from 'src/trace';
import { StatusCode } from 'src/tracing';

interface Env {}

export default {
	async fetch(req: Request, env: Env, ctx: ExecutionContext) {
		const trace = createTrace(req, env, ctx, {
			serviceName: 'span-builder-status',
			collector: {
				url: 'http://0.0.0.0:4318/v1/traces',
			},
		});

		const span = trace.buildSpan('fetch')
			.setStatus(StatusCode.UNSET);

		try {
			await fetch('https://example.com');
			span.setStatus(StatusCode.OK);
		} catch(e) {
			if (e instanceof Error) {
				span.setStatus(StatusCode.ERROR, e.message);
			} else {
				span.setStatus(StatusCode.ERROR, 'Unknown error');
			}
		}

		span.end();
		await trace.send();
		return new Response('ok', { headers: { 'x-trace-id': trace.getTraceId() } });
	},
};
