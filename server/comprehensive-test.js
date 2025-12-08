const { decodeSecret, encodeSecret } = require('./dist/utils/secrets');

console.log('Comprehensive test of improved Base64 detection:\n');

const tests = [
  { name: 'Valid Base64 (padded)', input: 'bXktc2VjcmV0', expected: 'my-secret', shouldDecode: true },
  { name: 'Valid Base64 with padding', input: 'bXktc2VjcmV0LWtleQ==', expected: 'my-secret-key', shouldDecode: true },
  { name: 'Plain text password', input: 'password123', expected: 'password123', shouldDecode: false },
  { name: 'Short plain text', input: 'admin', expected: 'admin', shouldDecode: false },
  { name: 'Hex string', input: 'a1b2c3d4e5f6', expected: 'a1b2c3d4e5f6', shouldDecode: false },
  { name: 'Example from .env', input: 'eW91ci1zZWNyZXQta2V5LWhlcmU=', expected: 'your-secret-key-here', shouldDecode: true },
];

let passed = 0;
let failed = 0;

tests.forEach(test => {
  const result = decodeSecret(test.input);
  const match = result === test.expected;
  console.log(`${match ? '✓' : '✗'} ${test.name}`);
  console.log(`  Input: ${test.input}`);
  console.log(`  Expected: ${test.expected}`);
  console.log(`  Got: ${result}`);
  if (match) {
    passed++;
  } else {
    failed++;
  }
  console.log('');
});

console.log(`Results: ${passed}/${tests.length} passed, ${failed}/${tests.length} failed`);
if (failed === 0) {
  console.log('\n✓ All tests passed!');
  process.exit(0);
} else {
  console.log('\n✗ Some tests failed');
  process.exit(1);
}
