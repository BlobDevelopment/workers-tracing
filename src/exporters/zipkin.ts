import { Span, Trace } from 'src/tracing';
import { generateSpanId } from 'src/utils/rand';
import { isHex } from 'src/utils/hex';
import { Exporter } from './exporter';
import type { SpanContext } from 'src/types';

export type ZipkinJson = ZipkinSpan[];

export interface ZipkinSpan {
	traceId: string;
	name: string;
	id: string; // Span ID
	parentId?: string;
	timestamp: number; // Microseconds
	duration: number; // Microseconds
	localEndpoint: ZipkinEndpoint;
	tags?: ZipkinTags;
	annotations?: ZipkinAnnotation[];
}

export interface ZipkinEndpoint {
	serviceName: string;
}

export interface ZipkinTags {
	[key: string]: string;
}

export interface ZipkinAnnotation {
	timestamp: number; // Microseconds
	value: string;
}

export class ZipkinExporter extends Exporter {

	transform(trace: Trace): ZipkinJson {
		const spans: ZipkinJson = [];

		for (const span of this.collectSpans(trace)) {
			const data = span.getData();

			if (span instanceof Trace) {
				// In the case of Zipkin, we want to put resource attributes on the span
				data.attributes = { ...span.getTracerOptions().resource?.attributes, ...data.attributes };
			}

			const tags: ZipkinTags = {};
			for (const [key, value] of Object.entries(data.attributes)) {
				tags[key] = String(value);
			}

			spans.push({
				name: data.name,
				traceId: data.traceId,
				id: data.id,
				parentId: data.parentId,
				timestamp: data.timestamp * 1e3,
				duration: data.duration * 1e3,
				localEndpoint: {
					serviceName: trace.getTracerOptions().serviceName,
				},
				tags,
				annotations: data.events.map((event) => ({ timestamp: event.timestamp * 1e3, value: event.name })),
			});
		}

		return spans;
	}

	injectContextHeaders(span: Span): Record<string, string> {
		// https://github.com/openzipkin/b3-propagation
		// https://github.com/openzipkin/b3-propagation#why-is-parentspanid-propagated
		return {
			'X-B3-TraceId': span.getTraceId(),
			'X-B3-ParentSpanId': span.getSpanId(), 
			'X-B3-SpanId': generateSpanId(),
			'X-B3-Sampled': '1', // TODO: Implement sampling
		};
	}

	readContextHeaders(headers: Headers): SpanContext | null {
		const traceId = headers.get('X-B3-TraceId');
		const spanId = headers.get('X-B3-ParentSpanId');

		if (!traceId || !spanId) {
			return null;
		}

		// Validation
		if ((traceId.length !== 32 && traceId.length !== 16)
			|| !isHex(traceId)
			|| spanId.length !== 16
			|| !isHex(spanId)
		) {
			return null;
		}

		return { traceId, spanId };
	}
}

export class ZipkinTransformer extends ZipkinExporter {}
