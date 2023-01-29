import { Span, Trace } from 'src/tracing';
import { isHex, hexToNumber, numberToHex } from 'src/utils/hex';
import { Exporter } from './exporter';
import type { Attribute, Attributes, SpanContext } from 'src/types';

export interface OtlpJson {
	resourceSpans: OtlpResourceSpan[];
}

export interface OtlpResourceSpan {
	resource: OtlpResource;
	scopeSpans: OtlpScopeSpan[];
}

export interface OtlpResource {
	attributes: OtlpAttribute[];
}

export interface OtlpScopeSpan {
	scope: OtlpScope;
	spans: OtlpSpan[];
}

export interface OtlpScope {
	name: string;
}

export interface OtlpSpan {
	traceId: string;
	spanId: string;
	parentSpanId?: string;
	name: string;
	kind: number;
	startTimeUnixNano: number;
	endTimeUnixNano: number;
	attributes: OtlpAttribute[];
	events: OtlpEvent[];
	status: OtlpStatus;
	links: OtlpLink[];
}

export interface OtlpStatus {
	code: number;
}

export interface OtlpAttribute {
	key: string;
	value: OtlpValue;
}

export interface OtlpValue {
	stringValue?: string;
	intValue?: number;
	boolValue?: boolean;
	doubleValue?: number;

	arrayValue?: { values: OtlpValue[] };
}

export interface OtlpEvent {
	name: string;
	timeUnixNano: number;
	attributes: OtlpAttribute[];
}

export interface OtlpLink {
	traceId: string;
	spanId: string;
	attributes: OtlpAttribute[];
}

export type TransformValue = (value: Attribute) => OtlpValue | null;

const VERSION = 0;

// Flags
const SAMPLED = 1 << 0;

interface ParentTraceInfo {
	traceparent?: string;
	tracestate?: string;
}

export class OtlpExporter extends Exporter {
	
	#parentTraceInfo: ParentTraceInfo;

	constructor() {
		super();
		this.#parentTraceInfo = {};
	}

	transform(trace: Trace): OtlpJson {
		return {
			resourceSpans: [
				{
					resource: {
						attributes: this.transformAttributes(
							{
								...trace.getTracerOptions().resource?.attributes,
							},
						),
					},

					scopeSpans: [
						{
							scope: {
								name: trace.getTracerOptions().serviceName,
							},
							spans: this.collectSpans(trace).map((span) => this.transformSpan(span)),
						},
					],
				},
			],
		};
	}

	transformAttributes(attributes: Attributes): OtlpAttribute[] {
		const transformed: OtlpAttribute[] = [];

		const transformValue: TransformValue = (value: Attribute) => {
			if (Array.isArray(value)) {
				const values: OtlpValue[] = [];

				for (const val of value) {
					const transformed = transformValue(val);
					if (transformed) {
						values.push(transformed);
					}
				}

				return { arrayValue: { values } };
			} else {
				if (typeof value === 'string') {
					return { stringValue: value };
				} else if (typeof value === 'number') {
					if (Number.isInteger(value)) {
						return { intValue: value };
					} else {
						return { doubleValue: value };
					}
				} else if (typeof value === 'boolean') {
					return { boolValue: value };
				} else {
					console.error('Unsupported value type: ' + typeof value);
					return null;
				}
			}
		};

		for (const [key, value] of Object.entries(attributes)) {
			const transformedValue = transformValue(value);
			if (transformedValue === null) continue; // Skip invalid values

			transformed.push({
				key: key,
				value: transformedValue,
			});
		}

		return transformed;
	}

	transformSpan(span: Span): OtlpSpan {
		const data = span.getData();

		return {
			traceId: data.traceId,
			spanId: data.id,
			parentSpanId: data.parentId,
			name: data.name,
			kind: 0, // TODO: Implement kind (https://opentelemetry.io/docs/reference/specification/trace/api/#spankind)
			startTimeUnixNano: data.timestamp * 1e6,
			endTimeUnixNano: (data.timestamp + data.duration) * 1e6,
			attributes: this.transformAttributes(data.attributes),
			events: data.events.map((event) => (
				{
					name: event.name,
					timeUnixNano: event.timestamp * 1e6,
					attributes: this.transformAttributes(event.attributes || {}),
				}
			)),
			status: data.status,
			links: data.links.map((link) => ({
				traceId: link.context.traceId,
				spanId: link.context.spanId,
				attributes: this.transformAttributes(link.attributes),
			})),
		};
	}

	injectContextHeaders(span: Span): Record<string, string> {
		const flags = 0;
		// TODO: Implement sampling
		// if (sampled) flags |= SAMPLED

		return {
			traceparent: `${numberToHex(VERSION, 2)}-${span.getTraceId()}-${span.getSpanId()}-${numberToHex(flags, 2)}`,
		};
	}

	readContextHeaders(headers: Headers): SpanContext | null {
		const traceparent = headers.get('traceparent');
		if (traceparent === null) return null;

		const parts = traceparent.split('-');

		// We expect at least 4 parts for version 0
		// <version>-<trace-id>-<span-id>-<flags>
		if (parts.length < 4) {
			return null;
		}

		const version = hexToNumber(parts[0]);
		const traceId = parts[1];
		const spanId = parts[2];
		const flags = parts[3];

		// Field validation failed
		if (version === null
			|| parts[0].length !== 2 // Version needs to be 2 hex chars
			|| traceId.length !== 32
			|| !isHex(traceId)
			|| spanId.length !== 16
			|| !isHex(spanId)
			|| flags.length !== 2
			|| !isHex(flags)
		) {
			return null;
		}

		// Valid :)
		this.#parentTraceInfo.traceparent = traceparent;

		// https://www.w3.org/TR/trace-context/#tracestate-header
		const tracestate = headers.get('tracestate');
		if (tracestate !== null) {
			this.#parentTraceInfo.tracestate = tracestate;
		}

		return { traceId, spanId };
	}

	collectSpans(span: Span): Span[] {
		const spans = [];

		spans.push(span);

		// Go through children and collect them all
		for (const childSpan of span.getChildSpans()) {
			spans.push(...this.collectSpans(childSpan));
		}

		return spans;
	}
}

/**
 * @deprecated Use OtlpExporter
 */
export class OtlpTransformer extends OtlpExporter {}
