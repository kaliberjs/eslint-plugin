const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('eol-last', () => {
  it('(eol-last) should report an error for missing newline at end of file', async () => {
    const code = `const x = 1;`;
    const result = await lint(code);
    assertHasWarning(result, 'eol-last');
  });
});
