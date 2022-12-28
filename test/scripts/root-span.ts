import { createTrace } from 'src/index';

interface Env {}

export default {
	async fetch(req: Request, env: Env, ctx: ExecutionContext) {
		const trace = createTrace(req, env, ctx, {
			serviceName: 'root-span',
			collector: {
				url: 'http://localhost:4318/v1/traces',
			}
		});

		await trace.send();
		return new Response('ok', { headers: { 'x-trace-id': trace.getTraceId() } });
	},

	generateId(length: number) {
		const arr = new Uint32Array(length);
		crypto.getRandomValues(arr);
	
		return Array.from(arr, (byte) => ('0' + (byte & 0xFF).toString(16)).slice(-2)).join('');
	}
}
