const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('no-eval', () => {
  it('(no-eval) should report an error for using eval()', async () => {
    const code = `eval('1 + 1');`;
    const result = await lint(code);
    assertHasWarning(result, 'no-eval');
  });
});
