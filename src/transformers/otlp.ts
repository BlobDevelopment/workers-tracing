import { Span, Trace } from 'src/tracing';
import { TraceTransformer } from './transformer';

export interface OtlpJson {
	resourceSpans: OtlpResourceSpan[];
}

interface OtlpResourceSpan {
	resource: OtlpResource;
	scopeSpans: OtlpScopeSpan[];
}

interface OtlpResource {
	attributes: OtlpAttribute[];
}

interface OtlpScopeSpan {
	scope: OtlpScope;
	spans: OtlpSpan[];
}

interface OtlpScope {
	name: string;
}

interface OtlpSpan {
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

interface OtlpStatus {
	code: number;
}

interface OtlpAttribute {
	key: string;
	value: OtlpValue;
}

interface OtlpValue {
	stringValue?: string;
	intValue?: number;
	boolValue?: boolean;
	// TODO: double?

	arrayValue?: { values: OtlpValue[] };
}

interface OtlpEvent {
	name: string;
	timeUnixNano: number;
	attributes: OtlpAttribute[];
}

interface OtlpLink {
	traceId: string;
	spanId: string;
	attributes: OtlpAttribute[];
}

type TransformValue = (value: Attribute) => OtlpValue | null;

export class OtlpTransformer extends TraceTransformer {

	transform(trace: Trace): OtlpJson {
		return {
			resourceSpans: [
				{
					resource: {
						attributes: this.transformAttributes(
							{
								...trace.getTracerOptions().resource?.attributes,
							}
						),
					},

					scopeSpans: [
						{
							scope: {
								name: trace.getTracerOptions().serviceName,
							},
							spans: this.collectSpans(trace).map((span) => this.transformSpan(span)),
						}
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
					return { intValue: value };
				} else if (typeof value === 'boolean') {
					return { boolValue: value };
				} else {
					console.error('Unsupported value type: ' + typeof value);
					return null;
				}
			}
		}

		for (const [key, value] of Object.entries(attributes)) {
			const transformedValue = transformValue(value);
			if (transformedValue === null) continue; // Skip invalid values

			transformed.push({
				key: key,
				value: transformedValue,
			})
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

	collectSpans(span: Span): Span[] {
		const spans = [];

		console.log(`collectSpans(${span.getSpanId()})`);
		spans.push(span);

		// Go through children and collect them all
		for (const childSpan of span.getChildSpans()) {
			spans.push(...this.collectSpans(childSpan));
		}

		console.log('  added ' + span.getChildSpans().length + ' spans');

		return spans;
	}
}
