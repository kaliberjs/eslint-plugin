const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('no-const-assign', () => {
  it('(no-const-assign) should report an error for reassigning a const', async () => {
    const code = `const a = 1; a = 2;`;
    const result = await lint(code);
    assertHasWarning(result, 'no-const-assign');
  });
});
