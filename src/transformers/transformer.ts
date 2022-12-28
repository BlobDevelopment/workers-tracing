import { Trace } from 'src/tracing';

export class Transformer {

	transform(trace: Trace): object {
		throw new Error('Transformer has not implemented `transform()` function');
	}
}
