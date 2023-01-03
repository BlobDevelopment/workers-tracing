import { createTrace } from 'src/trace';

interface Env {}

export default {
	async fetch(req: Request, env: Env, ctx: ExecutionContext) {
		const trace = createTrace(req, env, ctx, {
			serviceName: 'span-builder-add-remove-attributes',
			collector: {
				url: 'http://0.0.0.0:4318/v1/traces',
			},
		});

		// string | number | boolean | string[] | number[] | boolean[]
		const span = trace.buildSpan('fetch')
			.addAttribute('str', 'example.com')
			.addAttribute('int', 1337);

		await fetch('https://example.com');

		span.removeAttribute('str');

		span.end();
		await trace.send();
		return new Response('ok', { headers: { 'x-trace-id': trace.getTraceId() } });
	},
};
