import { createTrace } from 'src/trace';

interface Env {}

export default {
	async fetch(req: Request, env: Env, ctx: ExecutionContext) {
		const trace = createTrace(req, env, ctx, {
			serviceName: 'span-builder-attributes',
			collector: {
				url: 'http://0.0.0.0:4318/v1/traces',
			},
		});

		// string | number | boolean | string[] | number[] | boolean[]
		const span = trace.buildSpan('fetch')
			.addAttribute('str', 'example.com')
			.addAttribute('int', 1337)
			.addAttribute('double', 13.37)
			.addAttribute('bool', true)
			.addAttribute('strArray', ['a', 'b', 'c'])
			.addAttribute('intArray', [1, 2, 3])
			.addAttribute('doubleArray', [1.1, 2.2, 3.3])
			.addAttribute('boolArray', [true, false, true]);

		await fetch('https://example.com');

		span.end();
		await trace.send();
		return new Response('ok', { headers: { 'x-trace-id': trace.getTraceId() } });
	},
};
