import { Span, StatusCode } from './tracing';
import type { Attribute, Attributes, SpanContext } from './types';

export class SpanBuilder {

	#span: Span;

	constructor(parent: Span, name: string) {
		this.#span = parent.startSpan(name);
	}

	addAttribute(key: string, value: Attribute): SpanBuilder {
		this.#span.getData().attributes[key] = value;
		return this;
	}

	removeAttribute(key: string): SpanBuilder {
		delete this.#span.getData().attributes[key];
		return this;
	}

	setStatus(code: StatusCode, message?: string): SpanBuilder {
		this.#span.setStatus(code, message);
		return this;
	}

	addEvent(name: string, attributes?: Attributes): SpanBuilder {
		this.#span.addEvent({ name, timestamp: Date.now(), attributes });
		return this;
	}

	addLink(ctx: SpanContext | Span, attributes?: Attributes): SpanBuilder {
		if (ctx instanceof Span) {
			ctx = ctx.getContext();
		}

		this.#span.getData().links.push({ context: ctx, attributes: attributes ?? {} });
		return this;
	}

	end(timestamp?: number) {
		this.#span.end(timestamp);
	}
}
