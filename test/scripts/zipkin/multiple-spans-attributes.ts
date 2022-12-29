import { createTrace } from 'src/index';
import { ZipkinTransformer } from 'src/transformers/zipkin';
import { ATTRIBUTE_NAME, SPAN_NAME } from 'src/utils/constants';

interface Env {
	KV: KVNamespace;
}

export default {
	async fetch(req: Request, env: Env, ctx: ExecutionContext) {
		const trace = createTrace(req, env, ctx, {
			serviceName: 'multiple-spans-attributes',
			collector: {
				url: 'http://0.0.0.0:9411/api/v2/spans', // Zipkin compatible Jaeger endpoint
			},
			transformer: new ZipkinTransformer(),
		});

		await trace.trace(SPAN_NAME.FETCH, () => fetch('https://example.com'), {
			attributes: { [ATTRIBUTE_NAME.HTTP_HOST]: 'example.com' },
		});

		await trace.trace(SPAN_NAME.KV_GET, () => env.KV.get('abc'), {
			attributes: { [ATTRIBUTE_NAME.KV_KEY]: 'abc' },
		})

		await trace.send();
		return new Response('ok', { headers: { 'x-trace-id': trace.getTraceId() } });
	},
}
