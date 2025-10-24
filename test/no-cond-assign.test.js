const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('no-cond-assign', () => {
  it('(no-cond-assign) should report an error for assignment in conditional', async () => {
    const code = `let x; if (x = 1) {}`;
    const result = await lint(code);
    assertHasWarning(result, 'no-cond-assign');
  });
});
