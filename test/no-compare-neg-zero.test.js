const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('no-compare-neg-zero', () => {
  it('(no-compare-neg-zero) should report an error for comparing with -0', async () => {
    const code = `if (x === -0) {}`;
    const result = await lint(code);
    assertHasWarning(result, 'no-compare-neg-zero');
  });
});
