const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('no-dupe-args', () => {
  it('(no-dupe-args) should report an error for duplicate arguments', async () => {
    const code = `function f(a, a) {}`;
    const result = await lint(code);
    assertHasWarning(result, 'no-dupe-args');
  });
});
