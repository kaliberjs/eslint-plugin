const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('no-invalid-regexp', () => {
  it('(no-invalid-regexp) should report an error for invalid regex', async () => {
    const code = `new RegExp('[')`;
    const result = await lint(code);
    assertHasWarning(result, 'no-invalid-regexp');
  });
});
