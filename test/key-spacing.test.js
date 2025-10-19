const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('key-spacing', () => {
  it('(key-spacing) should report an error for missing space after colon', async () => {
    const code = `const obj = { a:1 };`;
    const result = await lint(code);
    assertHasWarning(result, 'key-spacing');
  });
});
