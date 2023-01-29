import { OtlpExporter } from './exporters/otlp';
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

	const exporter = tracerOptions.collector.exporter ?? new OtlpExporter();
	const context = exporter.readContextHeaders(req.headers);
	if (context !== null) {
		parentContext = context;
	}

	// Set the `exporter` to `transformer` if defined to keep backwards compat
	// Likewise, set the `transformer` if `exporter` is set
	// TODO: Remove
	if (tracerOptions.collector.transformer && !tracerOptions.collector.exporter) {
		tracerOptions.collector.exporter = tracerOptions.collector.transformer;
	} else if (tracerOptions.collector.exporter && !tracerOptions.collector.transformer) {
		tracerOptions.collector.transformer = tracerOptions.collector.exporter;
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

	const value = fn(span);

	if (value instanceof Promise) {
		value.finally(() => span.end());
		return value;
	}

	span.end();
	return value;
}

export function tracedFetch(
	parent: Span,
	request: string | Request,
	requestInit?: RequestInit | Request,
	spanOpts?: SpanCreationOptions,
): Promise<Response> {
	return parent.tracedFetch(request, requestInit, spanOpts);
}
