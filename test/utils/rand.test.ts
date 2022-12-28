import { expect, test } from 'vitest';
import { generateId } from 'src/utils/rand';

test('Generating IDs works', () => {
	const twoCharId = generateId(2);
	expect(twoCharId.length).toEqual(2);
});
