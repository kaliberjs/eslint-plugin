const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('no-caller', () => {
  it('(no-caller) should report an error for using arguments.caller', async () => {
    const code = `function f() { return arguments.caller; }`;
    const result = await lint(code);
    assertHasWarning(result, 'no-caller');
  });
});
