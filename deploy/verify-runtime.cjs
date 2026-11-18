const assert = require('node:assert/strict');
assert.equal(process.env.NODE_ENV, 'production');
const expected = process.argv[2] || 'true';
assert.equal(process.env.DISABLE_SCHEDULED_JOBS, expected);
const ort = require('/app/node_modules/onnxruntime-node');
const tensor = new ort.Tensor('float32', new Float32Array([1]), [1]);
assert.equal(tensor.data[0], 1);
console.log('Production environment: OK; scheduled jobs ' + (expected === 'true' ? 'paused.' : 'enabled.'));
console.log('ONNX CPU native binding: loaded successfully.');
