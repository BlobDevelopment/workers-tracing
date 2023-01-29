import { createTrace } from 'src/trace';
import { ZipkinExporter } from 'src/exporters/zipkin';

interface Env {}

export default {
	async fetch(req: Request, env: Env, ctx: ExecutionContext) {
		const trace = createTrace(req, env, ctx, {
			serviceName: 'test-ids',
			collector: {
				url: 'http://0.0.0.0:9411/api/v2/spans', // Zipkin compatible Jaeger endpoint
				exporter: new ZipkinExporter(),
			},
		});

		return Response.json({
			traceId: trace.getTraceId(),
			parentId: trace.getData().parentId,
		});
	},
};
