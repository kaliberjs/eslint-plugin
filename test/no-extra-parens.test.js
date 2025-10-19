const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('no-extra-parens', () => {
  it('(no-extra-parens) should report an error for unnecessary parentheses', async () => {
    const code = `const x = (1);`;
    const result = await lint(code);
    assertHasWarning(result, 'no-extra-parens');
  });
});
