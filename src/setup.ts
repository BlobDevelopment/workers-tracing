import { Trace } from './tracing';

export function createTrace(req: Request, env: unknown, ctx: ExecutionContext, tracerOptions: TracerOptions): Trace {
	// This is ugly
	// TODO: Fix this
	let parentContext: SpanContext | undefined;
	if ((req.cf as CfWithTrace)?.traceContext) {
		parentContext = (req.cf as CfWithTrace)?.traceContext;
	}
	if (req.headers.get('x-trace-id')) {
		const ids = req.headers.get('x-trace-id')?.split(':', 2);
		if (ids?.length === 2) {
			parentContext = { traceId: ids[0], spanId: ids[1] };
		}
	}

	// This parent context will allow properly tracing across services (and other Workers)
	console.log(`creating trace in ${tracerOptions.serviceName} `
		+ `(parent trace: ${parentContext?.traceId}, `
		+ `parent span: ${parentContext?.spanId})`
	);
	const trace = new Trace(ctx, {
		traceContext: parentContext,
		...tracerOptions
	});

	return trace;
}
