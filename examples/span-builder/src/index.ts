import { ATTRIBUTE_NAME, SPAN_NAME } from 'src/index';
import { createTrace } from 'src/trace';

export interface Env {
	KV: KVNamespace;
}

export default {
	async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const trace = createTrace(req, env, ctx, {
			serviceName: 'span-builder',
			collector: {
				url: 'http://localhost:4318/v1/traces',
			},
		});

		const forLoopSpan = trace.startSpan('for_loop');
		for (let i = 0; i < 10; i++) {
			const span = trace.buildSpan(SPAN_NAME.KV_GET)
				.addAttribute('Index', i)
				.addAttribute(ATTRIBUTE_NAME.KV_KEY, `id:${i}`)
				.addLink(forLoopSpan);

			await env.KV.put(`id:${i}`, JSON.stringify({ idx: i }));
			await env.KV.get(`id:${i}`);

			span.end();
		}
		forLoopSpan.end();

		trace.send();

		return new Response('ok');
	},
};
