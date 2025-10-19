const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('no-extra-label', () => {
  it('(no-extra-label) should report an error for unnecessary label', async () => {
    const code = `A: while (true) { break A; }`;
    const result = await lint(code);
    assertHasWarning(result, 'no-extra-label');
  });
});
