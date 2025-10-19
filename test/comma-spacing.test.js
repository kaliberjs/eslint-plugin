const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('comma-spacing', () => {
  it('(comma-spacing) should report an error for missing space after comma', async () => {
    const code = `const arr = [1,2];`;
    const result = await lint(code);
    assertHasWarning(result, 'comma-spacing');
  });
});
