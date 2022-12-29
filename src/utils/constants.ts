export const ATTRIBUTE_NAME = Object.freeze({
	SERVICE_NAME: 'service.name',
	SERVICE_VERSION: 'service.version',

	OTLP_STATUS_CODE: 'otel.status_code',
	ERROR: 'error',

	SDK_NAME: 'telemetry.sdk.name',
	SDK_VERSION: 'telemetry.sdk.version',
	SDK_LANG: 'telemetry.sdk.language',

	RUNTIME_NAME: 'process.runtime.name',
	RUNTIME_VERSION: 'process.runtime.version',
	RUNTIME_DESCRIPTION: 'process.runtime.description',

	HTTP_HOST: 'http.host',
	HTTP_PATH: 'http.path',

	// Workers specific
	KV_KEY: 'kv.key',
});

export const SPAN_NAME = Object.freeze({
	// General
	FETCH: 'fetch',
	// KV
	KV_GET: 'kv:get',
	KV_GET_METADATA: 'kv:getWithMetadata',
	KV_LIST: 'kv:list',
	KV_DELETE: 'kv:delete',
	// Durable Object
	DO_FETCH: 'durable_object:fetch',
	DO_ALARM: 'durable_object:alarm',
	// Service
	SERVICE_FETCH: 'service:fetch',
	// R2
	R2_HEAD: 'r2:head',
	R2_GET: 'r2:get',
	R2_PUT: 'r2:put',
	R2_LIST: 'r2:list',
	R2_DELETE: 'r2:delete',
	// WfP
	DISPATCHER_GET: 'wfp:dispatcher:get',
	WORKER_FETCH: 'wfp:worker:fetch',
	// Queues
	QUEUE_SEND: 'queue:send',
});
