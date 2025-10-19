const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('brace-style', () => {
  it('(brace-style) should report an error for invalid brace style', async () => {
    const code = `if (true)
{
  return false;
}`;
    const result = await lint(code);
    assertHasWarning(result, 'brace-style');
  });
});
