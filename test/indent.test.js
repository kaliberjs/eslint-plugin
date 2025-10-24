const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('indent', () => {
  it('(indent) should report an error for invalid indentation', async () => {
    const code = `if (true) {
    return false;
}`;
    const result = await lint(code);
    assertHasWarning(result, 'indent');
  });
});
