import { createTrace, Trace, SPAN_NAME, ATTRIBUTE_NAME } from 'workers-tracing';

interface Env {
	KV: KVNamespace;
}

export default {
	async fetch(req: Request, env: Env, ctx: ExecutionContext) {
		const trace = createTrace(req, env, ctx, {
			serviceName: 'basic-worker-tracing',
			collector: {
				url: 'http://localhost:4318/v1/traces',
			},
		});

		return this.handleRequest(req, env, trace);
	},

	async handleRequest(req: Request, env: Env, trace: Trace) {
		const { pathname } = new URL(req.url);
		const span = trace.startSpan('handleRequest', { attributes: { path: pathname } });

		await env.KV.put('abc', 'def');

		// .trace will return the value from the passed function
		// In this case, it'll return the KV value
		const val = await trace.trace(SPAN_NAME.KV_GET,
			() => env.KV.get('abc'),
			{ attributes: { [ATTRIBUTE_NAME.KV_KEY]: 'abc '} },
		);
		span.addEvent({ name: 'KV lookup', timestamp: Date.now(), attributes: { [ATTRIBUTE_NAME.KV_KEY]: 'abc' } });

		span.end();
		await trace.send();
		return new Response(val);
	},
};
