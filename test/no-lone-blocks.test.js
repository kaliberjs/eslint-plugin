const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('no-lone-blocks', () => {
  it('(no-lone-blocks) should report an error for lone blocks', async () => {
    const code = `{ var x = 1; }`;
    const result = await lint(code);
    assertHasWarning(result, 'no-lone-blocks');
  });
});
