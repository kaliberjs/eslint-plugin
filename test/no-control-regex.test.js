const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('no-control-regex', () => {
  it('(no-control-regex) should report an error for control characters in regex', async () => {
    const code = `const pattern = /\\x1f/;`;
    const result = await lint(code);
    assertHasWarning(result, 'no-control-regex');
  });
});
