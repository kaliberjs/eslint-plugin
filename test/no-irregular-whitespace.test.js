const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('no-irregular-whitespace', () => {
  it('(no-irregular-whitespace) should report an error for irregular whitespace', async () => {
    const code = `const x = ' ';`; // The whitespace here is a non-breaking space
    const result = await lint(code);
    assertHasWarning(result, 'no-irregular-whitespace');
  });
});
