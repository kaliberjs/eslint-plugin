const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('no-empty-character-class', () => {
  it('(no-empty-character-class) should report an error for empty character class in regex', async () => {
    const code = `const pattern = /^abc[]/;`;
    const result = await lint(code);
    assertHasWarning(result, 'no-empty-character-class');
  });
});
