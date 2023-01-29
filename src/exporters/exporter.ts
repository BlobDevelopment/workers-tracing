import { Span, Trace } from 'src/tracing';
import { SpanContext } from 'src/types';

export class Exporter {

	/**
	 * Transform a Trace into a JSON object which will be sent to the collector.
	 * 
	 * @param trace The Trace which needs to be transformed
	 * @returns The transformed Trace
	 */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	transform(trace: Trace): object {
		throw new Error('Transformer has not implemented `transform()` function');
	}

	/**
	 * Get the headers containing the trace context, these will be passed on to other services
	 * so that they can continue the trace. 
	 */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	injectContextHeaders(span: Span): Record<string, string> {
		return {};
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	readContextHeaders(headers: Headers): SpanContext | null {
		return null;
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
