import { createTrace, traceFn } from 'src/index';
import { Trace } from 'src/tracing';

interface Env {
	AUTH_TOKEN: string;
	KV: KVNamespace;
}

export default {
	async fetch(req: Request, env: Env, ctx: ExecutionContext) {
		const trace = createTrace(req, env, ctx, {
			serviceName: 'basic-worker-tracing',
			collector: {
				url: 'http://localhost:4318/v1/traces',
			}
		});

		await traceFn(trace, 'fetch', () => fetch('https://cherryjimbo.sucks/'));

		return this.handleRequest(req, env, trace);
	},

	async handleRequest(req: Request, env: Env, trace: Trace) {
		const { pathname } = new URL(req.url);
		const span = trace.startSpan('handleRequest', { attributes: { path: pathname } });

		await env.KV.put('abc', 'def');

		const val = await traceFn(span, 'kv get', () => env.KV.get('abc'), { attributes: { key: 'abc '} });

		span.end();
		await trace.send();
		return new Response(val);
	},
}
