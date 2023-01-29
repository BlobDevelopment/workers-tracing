import { createTrace } from 'src/trace';
import { OtlpExporter } from 'src/exporters/otlp';

interface Env {}

export default {
	async fetch(req: Request, env: Env, ctx: ExecutionContext) {
		const trace = createTrace(req, env, ctx, {
			serviceName: 'test-ids',
			collector: {
				url: 'http://0.0.0.0:4318/v1/traces', // OTLP compatible Jaeger endpoint
				exporter: new OtlpExporter(),
			},
		});

		return Response.json({
			traceId: trace.getTraceId(),
			parentId: trace.getData().parentId,
		});
	},
};
