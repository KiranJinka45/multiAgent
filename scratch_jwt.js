const jwt = require('jsonwebtoken');
const PRIVATE_KEY = '---DEVELOPMENT-ONLY-PRIVATE-KEY---';

const token = jwt.sign({ svc: 'gateway' }, PRIVATE_KEY, { algorithm: 'HS256', expiresIn: '5m' });
console.log('Token:', token);

try {
    const decoded = jwt.verify(token, PRIVATE_KEY, { algorithms: ['HS256'] });
    console.log('Decoded:', decoded);
} catch (err) {
    console.error('Error:', err.message);
}
