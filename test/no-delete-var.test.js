const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('no-delete-var', () => {
  it('(no-delete-var) should report an error for deleting a variable', async () => {
    const code = `let x; delete x;`;
    const result = await lint(code);
    assertHasWarning(result, 'no-delete-var');
  });
});
