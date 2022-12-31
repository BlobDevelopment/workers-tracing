import { createTrace } from 'src/trace';
import { ATTRIBUTE_NAME } from 'src/utils/constants';

interface Env {}

export default {
	async fetch(req: Request, env: Env, ctx: ExecutionContext) {
		const trace = createTrace(req, env, ctx, {
			serviceName: 'root-span-resource-attributes',
			collector: {
				url: 'http://0.0.0.0:4318/v1/traces',
			},
			resource: {
				attributes: {
					example: true,
					[ATTRIBUTE_NAME.RUNTIME_NAME]: 'blob-runtime',
				},
			},
		});

		await trace.send();
		return new Response('ok', { headers: { 'x-trace-id': trace.getTraceId() } });
	},
};
