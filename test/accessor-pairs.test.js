const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('accessor-pairs', () => {
  it('(accessor-pairs) should report an error for missing getter or setter', async () => {
    const code = `const obj = {
  set a(value) {
    this.val = value;
  }
};`;
    const result = await lint(code);
    assertHasWarning(result, 'accessor-pairs');
  });
});
