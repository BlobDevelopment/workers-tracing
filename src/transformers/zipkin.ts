import { Trace } from 'src/tracing';
import { TraceTransformer } from './transformer';

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

export class ZipkinTransformer extends TraceTransformer {

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
}
