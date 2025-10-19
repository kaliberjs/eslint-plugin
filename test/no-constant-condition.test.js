const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('no-constant-condition', () => {
  it('(no-constant-condition) should report an error for constant condition', async () => {
    const code = `if (true) {}`;
    const result = await lint(code);
    assertHasWarning(result, 'no-constant-condition');
  });
});
