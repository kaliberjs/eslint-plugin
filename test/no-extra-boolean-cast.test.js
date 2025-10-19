const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('no-extra-boolean-cast', () => {
  it('(no-extra-boolean-cast) should report an error for unnecessary boolean cast', async () => {
    const code = `if (!!foo) {}`;
    const result = await lint(code);
    assertHasWarning(result, 'no-extra-boolean-cast');
  });
});
