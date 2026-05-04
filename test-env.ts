import dotenv from 'dotenv';
import path from 'path';
dotenv.config();
console.log('GATEWAY_PORT:', process.env.GATEWAY_PORT);
console.log('NO_CLUSTER:', process.env.NO_CLUSTER);
