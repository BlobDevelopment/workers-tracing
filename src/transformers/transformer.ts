import { Span, Trace } from 'src/tracing';

export class TraceTransformer {

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	transform(trace: Trace): object {
		throw new Error('Transformer has not implemented `transform()` function');
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
