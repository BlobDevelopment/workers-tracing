import { createTrace, traceFn } from 'src/index';
import { Trace } from 'src/tracing';
import { ATTRIBUTE_NAME, SPAN_NAME } from 'src/utils/constants';

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

		await traceFn(trace, SPAN_NAME.FETCH, () => fetch('https://example.com/'));

		return this.handleRequest(req, env, trace);
	},

	async handleRequest(req: Request, env: Env, trace: Trace) {
		const { pathname } = new URL(req.url);
		const span = trace.startSpan('handleRequest', { attributes: { path: pathname } });

		await env.KV.put('abc', 'def');

		const val = await traceFn(span, SPAN_NAME.KV_GET, () => env.KV.get('abc'), { attributes: { [ATTRIBUTE_NAME.KV_KEY]: 'abc '} });
		span.addEvent({ name: 'KV lookup', timestamp: Date.now(), attributes: { [ATTRIBUTE_NAME.KV_KEY]: 'abc' } });

		span.end();
		await trace.send();
		return new Response(val);
	},
}
