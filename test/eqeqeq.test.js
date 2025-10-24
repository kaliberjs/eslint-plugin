const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('eqeqeq', () => {
  it('(eqeqeq) should report an error for using == instead of ===', async () => {
    const code = `if (x == 1) {}`;
    const result = await lint(code);
    assertHasWarning(result, 'eqeqeq');
  });
});
