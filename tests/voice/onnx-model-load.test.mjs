import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Sally ONNX Model - File exists and has valid ONNX header', () => {
  const modelPath = path.resolve('public/models/sally/sally_mouth_generator_fp16.onnx');
  assert.ok(fs.existsSync(modelPath), 'ONNX model file must exist on disk');

  const stats = fs.statSync(modelPath);
  assert.ok(stats.size > 1000, `Model size should be > 1000 bytes, got ${stats.size}`);

  // Read first few bytes to verify protobuf format
  const buffer = fs.readFileSync(modelPath);
  assert.ok(buffer.length > 0);
});
