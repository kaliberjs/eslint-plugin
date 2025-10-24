const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('no-func-assign', () => {
  it('(no-func-assign) should report an error for reassigning a function', async () => {
    const code = `function f() {}\nf = 1;`;
    const result = await lint(code);
    assertHasWarning(result, 'no-func-assign');
  });
});
