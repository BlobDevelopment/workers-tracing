import { createTrace } from 'src/trace';
import { OtlpExporter } from 'src/exporters/otlp';

interface Env {}

export default {
	async fetch(req: Request, env: Env, ctx: ExecutionContext) {
		const exporter = new OtlpExporter();
		const trace = createTrace(req, env, ctx, {
			serviceName: 'basic-fetch',
			collector: {
				url: 'http://0.0.0.0:4318/v1/traces', // OTLP compatible Jaeger endpoint
				exporter: exporter,
			},
		});

		const url = new URL(req.url);
		const address = url.searchParams.get('address');
		const port = url.searchParams.get('port');

		const span = trace.startSpan('fetch');
		const res = await fetch(`http://${address}:${port}/test`, {
			headers: {
				...exporter.injectContextHeaders(span),
			},
		});
		span.end();

		const context = await res.json<{ traceId: string, parentId: string }>();

		await trace.send();
		return new Response('ok', {
			headers: {
				'trace-id': trace.getTraceId(),
				'span-id': span.getSpanId(),
				'fetched-trace-id': context.traceId,
				'fetched-parent-id': context.parentId,
			},
		});
	},
};
