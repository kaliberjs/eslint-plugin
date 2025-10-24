const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('no-empty-pattern', () => {
  it('(no-empty-pattern) should report an error for empty pattern', async () => {
    const code = `const {} = foo;`;
    const result = await lint(code);
    assertHasWarning(result, 'no-empty-pattern');
  });
});
