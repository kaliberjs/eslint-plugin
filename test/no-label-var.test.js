const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('no-label-var', () => {
  it('(no-label-var) should report an error for label with same name as variable', async () => {
    const code = `let x; x: while (true) { break x; }`;
    const result = await lint(code);
    assertHasWarning(result, 'no-label-var');
  });
});
