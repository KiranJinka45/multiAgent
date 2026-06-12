import { ml_kem768 } from '@noble/post-quantum/ml-kem';
import * as utils from '@packages/utils';

const keys = ml_kem768.keygen();
const encResult = ml_kem768.encapsulate(keys.publicKey);
console.log('mlkem encapsulate keys:', Object.keys(encResult));
console.log('mlkem encapsulate keys/constructor:', encResult.constructor.name);
console.log('mlkem encapsulate value:', encResult);

console.log('utils exported keys:', Object.keys(utils));
