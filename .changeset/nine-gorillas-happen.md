---
"workers-tracing": patch
---

Added a span builder, this will allow for a more friendly experience.

Example usage:
```
const span = trace.buildSpan(SPAN_NAME.KV_GET)
	.addAttribute('Index', i)
	.addAttribute(ATTRIBUTE_NAME.KV_KEY, `id:${i}`)
	.addLink(forLoopSpan);

span.end();
```
