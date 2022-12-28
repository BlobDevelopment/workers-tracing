// import { setupTracing } from 'workers-opentelemtry';
import { createTrace } from 'src/setup';
import { Span, Trace } from 'src/tracing';

interface Env {
	AUTH_TOKEN: string;
	SERVICE: Fetcher;
}

export default {
	async fetch(req: Request, env: Env, ctx: ExecutionContext) {
		const trace = createTrace(req, env, ctx, {
			serviceName: 'service-binding-example',
			collector: {
				url: 'http://localhost:4318/v1/traces',
				headers: {
					Authorization: `Bearer ${env.AUTH_TOKEN}`,
				}
			}
		});

		return this.handleRequest(req, env, trace);
	},

	async handleRequest(req: Request, env: Env, trace: Trace) {
		const { pathname } = new URL(req.url);
		const span = trace.startSpan('handleRequest', { attributes: { path: pathname } });

		const serviceBindingSpan = span.startSpan('service binding', { attributes: { service: 'basic' } });
		const res = await env.SERVICE.fetch('https://service/test', { headers: { 'x-trace-id': `${serviceBindingSpan.getContext().traceId}:${serviceBindingSpan.getContext().spanId}` }});
		serviceBindingSpan.end();

		span.end();
		await trace.send();
		return res;
	},
}
