import { createTrace, SPAN_NAME, Trace, traceFn, ZipkinTransformer } from 'workers-tracing';

interface Env {
	AUTH_TOKEN: string;
	KV: KVNamespace;
}

export default {
	async fetch(req: Request, env: Env, ctx: ExecutionContext) {
		const trace = createTrace(req, env, ctx, {
			serviceName: 'basic-worker-tracing',
			collector: {
				url: 'http://localhost:9411/api/v2/spans',
				transformer: new ZipkinTransformer(),
			},
		});

		await traceFn(trace, SPAN_NAME.FETCH, () => fetch('https://example.com/'));

		return this.handleRequest(req, env, trace);
	},

	async handleRequest(req: Request, env: Env, trace: Trace) {
		const { pathname } = new URL(req.url);
		const span = trace.startSpan('handleRequest', { attributes: { path: pathname } });

		await env.KV.put('abc', 'def');

		const val = await traceFn(span, SPAN_NAME.KV_GET, () => env.KV.get('abc'), { attributes: { key: 'abc '} });
		span.addEvent({ name: 'Fetch done', timestamp: Date.now() });

		span.end();
		await trace.send();
		return new Response(val);
	},
};
