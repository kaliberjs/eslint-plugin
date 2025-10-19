const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('comma-style', () => {
  it('(comma-style) should report an error for invalid comma style', async () => {
    const code = `const arr = [1
, 2];`;
    const result = await lint(code);
    assertHasWarning(result, 'comma-style');
  });
});
