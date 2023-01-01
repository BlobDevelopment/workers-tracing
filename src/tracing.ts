import { OtlpTransformer } from './transformers/otlp';
import { ATTRIBUTE_NAME } from './utils/constants';
import { generateSpanId, generateTraceId } from './utils/rand';
import { traceFn } from './trace';
import type {
	Attributes,
	SpanContext,
	SpanCreationOptions,
	SpanData,
	SpanEvent,
	TracedFn,
	TracerOptions,
} from './types';

export enum StatusCode {
	UNSET = 0,
	OK 		= 1,
	ERROR = 2,
}

export function getDefaultAttributes(opts: TracerOptions): Attributes {
	return {
		[ATTRIBUTE_NAME.SERVICE_NAME]: opts.serviceName,
		[ATTRIBUTE_NAME.SDK_NAME]: 'workers-tracing',
		[ATTRIBUTE_NAME.SDK_LANG]: 'javascript',
		[ATTRIBUTE_NAME.SDK_VERSION]: '__VERSION__',
		[ATTRIBUTE_NAME.RUNTIME_NAME]: navigator.userAgent, // Cloudflare-Workers
	};
}

export class Span {
	
	#span: SpanData;
	#childSpans: Span[];

	constructor(traceId: string, name: string, spanOptions?: SpanCreationOptions) {
		this.#span = {
			traceId: traceId,
			name,
			id: generateSpanId(),
			parentId: spanOptions?.parentId,
			timestamp: spanOptions?.timestamp ?? Date.now(),
			duration: spanOptions?.duration ?? 0,
			attributes: spanOptions?.attributes ?? {},
			status: spanOptions?.status ?? { code: StatusCode.UNSET },
			events: spanOptions?.events ?? [],
			links: spanOptions?.links ?? [],
		};
		this.#childSpans = [];
	}

	getTraceId() {
		return this.#span.traceId;
	}

	getSpanId() {
		return this.#span.id;
	}

	getData() {
		return this.#span;
	}

	getChildSpans() {
		return this.#childSpans;
	}

	getContext(): SpanContext {
		return { traceId: this.#span.traceId, spanId: this.#span.id };
	}

	startSpan(name: string, spanOptions?: SpanCreationOptions): Span {
		const span = new Span(this.#span.traceId, name, spanOptions);
		span.#span.parentId = this.getSpanId();

		// TODO: Figure out how to get this attached to Trace
		// Do I like this?
		this.#childSpans.push(span);

		return span;
	}

	trace<T>(name: string, fn: TracedFn<T>, opts?: SpanCreationOptions): T {
		return traceFn(this, name, fn, opts);
	}

	setStatus(status: StatusCode, message?: string) {
		this.#span.status = { code: status, message };
	}

	addEvent(event: SpanEvent) {
		this.#span.events.push(event);
	}

	end() {
		this.#span.duration = Date.now() - this.#span.timestamp;
	}
}

export class Trace extends Span {

	#ctx: ExecutionContext;
	#tracerOptions: TracerOptions;

	constructor(
		ctx: ExecutionContext,
		tracerOptions: TracerOptions,
		spanOptions?: SpanCreationOptions,
	) {
		super(
			tracerOptions.traceContext?.traceId ?? generateTraceId(),
			'Request (fetch event)',
			{
				parentId: tracerOptions.traceContext?.spanId,
				...spanOptions,
			},
		);
		this.#ctx = ctx;
		this.#tracerOptions = tracerOptions;

		if (!this.#tracerOptions.resource) {
			this.#tracerOptions.resource = { attributes: getDefaultAttributes(tracerOptions) };
		} else if (!this.#tracerOptions.resource.attributes) {
			this.#tracerOptions.resource.attributes = getDefaultAttributes(tracerOptions);
		} else {
			this.#tracerOptions.resource.attributes = {
				...getDefaultAttributes(tracerOptions),
				...this.#tracerOptions.resource.attributes,
			};
		}
	}

	/**
	 * @deprecated Use #getChildSpans
	 */
	getSpans() {
		return this.getChildSpans();
	}

	getTracerOptions() {
		return this.#tracerOptions;
	}

	async send() {
		// We need to end the trace here
		this.end();

		// TODO: Properly fix this
		const headers = this.#tracerOptions.collector.headers || {};
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		headers['Content-Type'] = 'application/json';
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore		
		headers['x-trace-id'] = this.getTraceId();

		let body;
		if (this.#tracerOptions.collector.transformer) {
			body = this.#tracerOptions.collector.transformer.transform(this);
		} else {
			body = new OtlpTransformer().transform(this);
		}

		const bodyStr = JSON.stringify(body);

		// If we're in Miniflare, we wait for the fetch to complete.
		// This is mainly for tests but helpful for local testing too
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		if (globalThis.MINIFLARE) {
			const res = await fetch(this.#tracerOptions.collector.url, {
				method: 'POST',
				headers,
				body: bodyStr,
			});

			const txt = await res.text();
			console.log(txt);
		} else {
			this.#ctx.waitUntil(fetch(this.#tracerOptions.collector.url, {
				method: 'POST',
				headers,
				body: bodyStr,
			}));
		}
	}
}
