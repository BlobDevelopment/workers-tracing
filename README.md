# Workers Tracing

Workers tracing is a small (~2.6 KB compressed), zero-dependency library for having distributed tracing within [Cloudflare Workers](https://workers.cloudflare.com/).

There are currently 2 different formats supported:
- [OpenTelemetry](https://opentelemetry.io/) is a standard tracing/metrics/logs format. It has wide support in many different services such as [Jaeger](https://www.jaegertracing.io/).
- [Zipkin](https://zipkin.io/) is another widely adopted format which is focused on tracing.

> **Warning**
> This library is in beta, consider any minor version change a possibly breaking change. I will try to keep compatibiltiy for at least 1 version but cannot guarantee it.
> Please provide feedback in [Issues](https://github.com/BlobDevelopment/workers-tracing/issues)

> **Note**
> This is an opinionated library, it does not use the standard patterns and base libraries.
> This was done very intentionally, we believe this libary is much cleaner (and just lighter) than the standard libraries.

## Install

Installing this package is easy, you simply need to install the npm package like so:
```
npm install --save workers-tracing
```

## Usage

### JavaScript

```js
import { createTrace, SPAN_NAME, ATTRIBUTE_NAME } from 'workers-tracing';

export default {
	async fetch(req, env, ctx) {
		const trace = createTrace(req, env, ctx, {
			serviceName: 'basic-worker-tracing',
			collector: {
				url: 'http://localhost:4318/v1/traces',
			},
		});

		return this.handleRequest(req, env, trace);
	},

	async handleRequest(req, env, trace) {
		const { pathname } = new URL(req.url);
		const span = trace.startSpan('handleRequest', { attributes: { path: pathname } });

		await env.KV.put('abc', 'def');

		// .trace will return the value from the passed function
		// In this case, it'll return the KV value
		const val = await trace.trace(SPAN_NAME.KV_GET,
			() => env.KV.get('abc'),
			// There are a bunch of built in attribute/span names which you can use
			// This will allow you to ensure consistency in naming throughout your Workers
			{ attributes: { [ATTRIBUTE_NAME.KV_KEY]: 'abc '} },
		);
		span.addEvent({ name: 'KV lookup', timestamp: Date.now(), attributes: { [ATTRIBUTE_NAME.KV_KEY]: 'abc' } });

		span.end();
		await trace.send();
		return new Response(val);
	},
};
```
(see more in the [examples folder](https://github.com/BlobDevelopment/workers-tracing/tree/main/examples))

### TypeScript

```ts
import { createTrace, Trace, SPAN_NAME, ATTRIBUTE_NAME } from 'workers-tracing';

interface Env {
	KV: KVNamespace;
}

export default {
	async fetch(req: Request, env: Env, ctx: ExecutionContext) {
		const trace = createTrace(req, env, ctx, {
			serviceName: 'basic-worker-tracing',
			collector: {
				url: 'http://localhost:4318/v1/traces',
			},
		});

		return this.handleRequest(req, env, trace);
	},

	async handleRequest(req: Request, env: Env, trace: Trace) {
		const { pathname } = new URL(req.url);
		const span = trace.startSpan('handleRequest', { attributes: { path: pathname } });

		await env.KV.put('abc', 'def');

		// .trace will return the value from the passed function
		// In this case, it'll return the KV value
		const val = await trace.trace(SPAN_NAME.KV_GET,
			() => env.KV.get('abc'),
			{ attributes: { [ATTRIBUTE_NAME.KV_KEY]: 'abc '} },
		);
		span.addEvent({ name: 'KV lookup', timestamp: Date.now(), attributes: { [ATTRIBUTE_NAME.KV_KEY]: 'abc' } });

		span.end();
		await trace.send();
		return new Response(val);
	},
};
```
(see more in the [examples folder](https://github.com/BlobDevelopment/workers-tracing/tree/main/examples))

### Jaeger

To send traces to the Jaeger [OpenTelemetry compatible collector](https://www.jaegertracing.io/docs/1.40/deployment/#collector) you will need to make sure Jaeger is configured to accept [OpenTelemetry](https://opentelemetry.io/) or [Zipkin](https://zipkin.io/).

For [OpenTelemetry](https://opentelemetry.io/) you will need to enable the compatibility support with `COLLECTOR_OTLP_ENABLED=true` (and make sure port `4318` is mapped).

For [Zipkin](https://zipkin.io/) you will need to enable the JSON compatible layer by setting `COLLECTOR_ZIPKIN_HOST_PORT=:9411` (or a different port - make sure to map this).

Here is an example command to run the `all-in-one` Docker image with the [OpenTelemetry](https://opentelemetry.io/) and [Zipkin](https://zipkin.io/) compatible collector enabled:
```sh
$ docker run -d --name jaeger \
  -e COLLECTOR_ZIPKIN_HOST_PORT=:9411 \
  -e COLLECTOR_OTLP_ENABLED=true \
  -p 6831:6831/udp \
  -p 6832:6832/udp \
  -p 5778:5778 \
  -p 16686:16686 \
  -p 4317:4317 \
  -p 4318:4318 \
  -p 14250:14250 \
  -p 14268:14268 \
  -p 14269:14269 \
  -p 9411:9411 \
  jaegertracing/all-in-one:1.40
```

(or through their binary: https://www.jaegertracing.io/download/ - `COLLECTOR_ZIPKIN_HOST_PORT=:9411 COLLECTOR_OTLP_ENABLED=true ./jaeger-all-in-one`)

Once that is up, just set your collector URL in your Worker.
Here's an example of sending to the OTLP compatible endpoint:
```js
const trace = createTrace(req, env, ctx, {
	serviceName: 'basic-worker-tracing',
	collector: {
		url: 'http://localhost:4318/v1/traces',
	}
});
```

## Support

### Cloudflare Workers

This library will work out of the box for Workers but see [limitations]() for the current limitations.

## Limitations

### Cloudflare Workers

There are a few limitations when using with Cloudflare Workers today, these include:
- Env is not currently patchable, this means you'd need to do like `span.trace('kv:get', () => env.KV.get('abc'))` over just doing `env.KV.get('abc')`
- Tracing cannot automatically resume tracing between services right now, see the [service binding example](https://github.com/BlobDevelopment/workers-tracing/tree/main/examples/service-binding) for how to do it today

## Future

There are a bunch of things planned for v1 including:
- Patching env (optional thing) - this will allow you to do `env.KV.get()` like normal and have tracing automatically. No need to wrap it in a trace.
- Span builder - Just a nice builder pattern for the trace (credit to [repeat.dev](https://repeat.dev/) for that idea).

I'd also like to make sure that Deno is supported. If you'd like to test this and fix it (or just modify the README and add tests) then please do PR :)

Outside of this lib, I want to have a related project of putting all tracing components (Sender, Collector and UI) all on Cloudflare (Workers, Workers/R2 and Pages). If this interests you, let me know!
