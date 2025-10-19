const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('no-dupe-keys', () => {
  it('(no-dupe-keys) should report an error for duplicate keys in object', async () => {
    const code = `const obj = { a: 1, a: 2 };`;
    const result = await lint(code);
    assertHasWarning(result, 'no-dupe-keys');
  });
});
