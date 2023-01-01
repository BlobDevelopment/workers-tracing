import { createTrace } from 'src/trace';
import { OtlpTransformer } from 'src/transformers/otlp';
import { ATTRIBUTE_NAME, SPAN_NAME } from 'src/utils/constants';

interface Env {}

export default {
	async fetch(req: Request, env: Env, ctx: ExecutionContext) {
		const trace = createTrace(req, env, ctx, {
			serviceName: 'single-span-attributes-and-events',
			collector: {
				url: 'http://0.0.0.0:4318/v1/traces', // OTLP compatible Jaeger endpoint
				transformer: new OtlpTransformer(),
			},
		});

		const span = trace.startSpan(SPAN_NAME.FETCH, {
			attributes: { [ATTRIBUTE_NAME.HTTP_HOST]: 'example.com' },
		});

		const res = await fetch('https://example.com');
		span.addEvent({
			name: 'Fetch done',
			timestamp: Date.now(),
			attributes: {
				[ATTRIBUTE_NAME.HTTP_HOST]: 'example.com',
			},
		});

		await res.text();
		span.addEvent({
			name: 'Response body parsed',
			timestamp: Date.now(),
			attributes: {
				parsed: 'text',
			},
		});

		span.end();
		await trace.send();
		return new Response('ok', { headers: { 'x-trace-id': trace.getTraceId() } });
	},
};
