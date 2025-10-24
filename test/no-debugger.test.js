const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('no-debugger', () => {
  it('(no-debugger) should report an error for using debugger', async () => {
    const code = `debugger;`;
    const result = await lint(code);
    assertHasWarning(result, 'no-debugger');
  });
});
