const HEX_REGEX = /[a-f0-9]+/;

export function isHex(str: string) {
	return HEX_REGEX.test(str);
}

export function hexToNumber(str: string) {
	return parseInt(str, 16);
}

export function numberToHex(num: number, length?: number) {
	let hex = num.toString(16);

	if (length && hex.length < length) {
		hex = '0'.repeat(length - hex.length) + hex;
	}

	return hex;
}
