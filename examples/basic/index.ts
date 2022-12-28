// import { setupTracing } from 'workers-opentelemtry';
import { createTrace } from 'src/setup';
import { Span, Trace } from 'src/tracing';

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
				headers: {
					Authorization: `Bearer ${env.AUTH_TOKEN}`,
				}
			}
		});

		await this.tracedFetch(trace, 'https://cherryjimbo.sucks/');

		return this.handleRequest(req, env, trace);
	},

	async handleRequest(req: Request, env: Env, trace: Trace) {
		const { pathname } = new URL(req.url);
		const span = trace.startSpan('handleRequest', { attributes: { path: pathname } });

		await this.tracedFetch(span, 'https://cherryjimbo.sucks/');
		await this.tracedFetch(span, 'https://cherryjimbo.sucks/');

		const kvSpan = span.startSpan('kv get', { attributes: { key: 'abc' } });
		const val = await env.KV.get('abc');
		kvSpan.end();

		span.end();
		await trace.send();
		return new Response('ok');
	},

	async tracedFetch(trace: Trace | Span, request: Request | string, requestInitr?: RequestInit | Request): Promise<Response> {
		const span = trace.startSpan('fetch');
		return fetch(request, requestInitr).then((res) => { span.end(); return res });
	}
}
