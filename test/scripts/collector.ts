// This Worker is responsible for collecting traces so that we can validate them

interface Env {
	KV: KVNamespace;
}

export default {
	async fetch(req: Request, env: Env) {
		const { pathname } = new URL(req.url);

		if (
			pathname === '/v1/traces' // Jaeger OTLP
			|| pathname === '/api/v2/spans' // Jaeger Zipkin
		) {
			// Validation
			if (req.headers.get('content-type') !== 'application/json') {
				return Response.json({ error: '"content-type: application/json" is required' }, { status: 400 });
			}

			const body = await req.json();

			const traceId = req.headers.get('x-trace-id');
			if (traceId !== null) {
				await env.KV.put(traceId, JSON.stringify(body));
			} else {
				return Response.json({ error: 'No x-trace-id header provided' }, { status: 400 });
			}

			return Response.json({ message: 'Trace ingested' });

		} else if (pathname.startsWith('/__/lookup/')) {
			const traceId = pathname.replace('/__/lookup/', '');

			const value = await env.KV.get(traceId, 'json');
			if (value === null) {
				return Response.json({ error: 'Trace not found' }, { status: 404 });
			}

			return Response.json(value);
		}

		return Response.json({ error: 'Not found' }, { status: 404 });
	},
};
