import { Span, Trace } from './tracing';
import { CfWithTrace, SpanContext, SpanCreationOptions, TracedFn, TracerOptions } from './types';

export function createTrace(
	req: Request,
	env: unknown,
	ctx: ExecutionContext,
	tracerOptions: TracerOptions,
	spanOptions?: SpanCreationOptions,
): Trace {
	// This is ugly
	// TODO: Fix this - https://www.w3.org/TR/trace-context/#traceparent-header
	// https://zipkin.io/pages/architecture.html - https://github.com/openzipkin/b3-propagation#overall-process
	// This parent context will allow properly tracing across services (and other Workers)
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

	const trace = new Trace(ctx, {
		traceContext: parentContext,
		...tracerOptions,
	}, spanOptions);

	return trace;
}

export function traceFn<T>(
	parent: Span,
	name: string,
	fn: TracedFn<T>,
	opts?: SpanCreationOptions,
): T {
	const span = parent.startSpan(name, opts);

	const value = fn();

	if (value instanceof Promise) {
		value.finally(() => span.end());
		return value;
	}
	
	span.end();
	return value;
}
