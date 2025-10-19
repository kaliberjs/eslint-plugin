const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('no-labels', () => {
  it('(no-labels) should report an error for using labels', async () => {
    const code = `A: var x = 1;`;
    const result = await lint(code);
    assertHasWarning(result, 'no-labels');
  });
});
