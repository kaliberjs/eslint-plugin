const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('no-implied-eval', () => {
  it('(no-implied-eval) should report an error for implied eval', async () => {
    const code = `setTimeout("alert('Hi!');", 100);`;
    const result = await lint(code);
    assertHasWarning(result, 'no-implied-eval');
  });
});
