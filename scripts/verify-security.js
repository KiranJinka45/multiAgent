const { createPayloadSanitizerMiddleware } = require('./packages/utils/src/middleware/security');
const express = require('express');

const mockRes = {
    status: function(code) {
        this.statusCode = code;
        return this;
    },
    json: function(data) {
        this.data = data;
        return this;
    }
};

const mockNext = () => console.log('Next called (Safe)');

const sanitizer = createPayloadSanitizerMiddleware();

const testCases = [
    { name: 'Safe', body: { prompt: 'hello' }, expected: 200 },
    { name: 'Unsafe', body: { prompt: 'rm -rf /' }, expected: 403 }
];

testCases.forEach(t => {
    const res = Object.assign({}, mockRes);
    sanitizer({ method: 'POST', body: t.body, headers: {} }, res, () => res.statusCode = 200);
    console.log(`Test [${t.name}]: Result ${res.statusCode || 200}`);
});
