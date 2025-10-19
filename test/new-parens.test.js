const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('new-parens', () => {
  it('(new-parens) should report an error for missing parentheses on constructor', async () => {
    const code = `function MyClass() {}\n new MyClass;`;
    const result = await lint(code);
    assertHasWarning(result, 'new-parens');
  });
});
