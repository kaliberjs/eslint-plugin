const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('no-ex-assign', () => {
  it('(no-ex-assign) should report an error for reassigning exception in catch', async () => {
    const code = `try {} catch (e) { e = 1; }`;
    const result = await lint(code);
    assertHasWarning(result, 'no-ex-assign');
  });
});
