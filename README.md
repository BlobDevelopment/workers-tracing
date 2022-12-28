# Workers Tracing

This library will allow you to send [OpenTelemtry](https://opentelemetry.io/) traces inside of [Cloudflare Workers](https://workers.cloudflare.com/). OpenTelemtry is a standard tracing/metrics/logs format. With this you could send traces to your server and view them in something like [Jaeger](https://www.jaegertracing.io/).

## Install

Installing this package is easy, you simply need to install the npm package like so:
```
npm install --save workers-opentelemtry
```

## Usage

### JavaScript

```js
import { setupTracing } from 'workers-opentelemtry';

export default {
	fetch(req, env, ctx) {
		const tracing = createTrace(req, env, ctx, {
			collector: {
				url: 'https://tracing.example.com/v1/collect',
				headers: {
					Authorization: `Bearer ${env.AUTH_TOKEN}`,
				}
			}
		});

		// This will allow tracing for bindings (future:tm:)
		env = tracing.patchedEnv;

		return this.handleRequest(req, tracing);
	},

	handleRequest(req, tracing) {
		tracing.addSpan('handleRequest', { tags: { path: req.url.toString() } });

		// ... logic stuff
	}
}
```

### TypeScript

### Jaeger

To send traces to Jaeger we want to enable their [OpenTelemetry compatible collector](https://www.jaegertracing.io/docs/1.40/deployment/#collector). This is until `workers-tracing` supports Jaeger out of the box.

To start, you will want to run Jaeger with `COLLECTOR_OTLP_ENABLED` enabled and make sure port `4318` is mapped.

Here is an example command to run the `all-in-one` Docker image with the OpenTelemetry compatible collector.
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

Once that is up, just set your collector URL in your Worker.
Example:
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

| Thing         | Status       | Comment     |
| ------------- | ------------ | ----------- |
| `fetch` event | ✅ Supported | Added in v1 |
| `fetch` API   | ✅ Supported | Added in v1 |
| TODO          | Make         | This        |

## Limitations

## Goals

## Future

In the future, I'd like to have all tracing, storage and viewing on Cloudflare. For now, I'd recommend [Jaeger](https://www.jaegertracing.io/).

I'd also like to make sure that Deno is supported. If you'd like to test this and fix it (or just modify the README and add a test) then please do PR :)
