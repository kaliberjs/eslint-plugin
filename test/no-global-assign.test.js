const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('no-global-assign', () => {
  it('(no-global-assign) should report an error for reassigning a global variable', async () => {
    const code = `Object = {};`;
    const result = await lint(code);
    assertHasWarning(result, 'no-global-assign');
  });
});
