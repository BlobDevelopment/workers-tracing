import { Span, Trace } from 'src/tracing';
import { Transformer } from './transformer';

interface Value {
	stringValue?: string;
	intValue?: number;
	boolValue?: boolean;
	// double?

	arrayValue?: { values: Value[] };
}

type TransformValue = (value: Attribute) => Value | null;

export class OtlpJson extends Transformer {

	transform(trace: Trace): object {
		return {
			resourceSpans: [
				{
					resource: {
						attributes: this.transformAttributes(
							{
								'service.name': trace.getTracerOptions().serviceName,
								...trace.getRootSpan().getData().attributes
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

	transformAttributes(attributes: Attributes) {
		const transformed = [];

		const transformValue: TransformValue = (value: Attribute) => {
			if (Array.isArray(value)) {
				const values: Value[] = [];

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
			transformed.push({
				key: key,
				value: transformValue(value),
			})
		}

		return transformed;
	}

	transformSpan(span: Span) {
		const data = span.getData();

		return {
			traceId: data.traceId,
			spanId: data.id,
			parentSpanId: data.parentId,
			name: data.name,
			kind: 0, // TODO: Implement kind (https://opentelemetry.io/docs/reference/specification/trace/api/#spankind)
			startTimeUnixNano: data.timestamp * 1e6/*BigInt(data.timestamp * 1e6)*/,
			endTimeUnixNano: (data.timestamp + data.duration) * 1e6/*BigInt((data.timestamp + data.duration) * 1e6)*/,
			attributes: this.transformAttributes(data.attributes),
			events: data.events.map((event) => (
				{
					name: event.name,
					timeUnixNano: event.timeStamp * 1e6/*BigInt(event.timeStamp * 1e6)*/,
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

	collectSpans(traceSpan: Trace | Span): Span[] {
		const spans = [];

		console.log(`collectSpans(${traceSpan.getSpanId()})`);

		// This is a trace
		if ("getRootSpan" in traceSpan) {
			console.log('collectSpans looking at trace');
			spans.push(traceSpan.getRootSpan());
			spans.push(...traceSpan.getSpans());
			console.log('  added ' + traceSpan.getSpans().length + ' spans');

			for (const span of traceSpan.getSpans()) {
				spans.push(...this.collectSpans(span));
			}
		} else {
			console.log('collectSpans looking at span');
			spans.push(...traceSpan.getChildSpans());
			console.log('  added ' + traceSpan.getChildSpans().length + ' child spans');
			for (const childSpan of traceSpan.getChildSpans()) {
				spans.push(...this.collectSpans(childSpan));
			}
		}

		return spans;
	}
}
