export function generateTraceId() {
	return generateId(16);
}

export function generateSpanId() {
	return generateId(8);
}

export function generateId(length: number) {
	const arr = new Uint32Array(length);
	crypto.getRandomValues(arr);

	return Array.from(arr, (byte) => ('0' + (byte & 0xFF).toString(16)).slice(-2)).join('');
}
