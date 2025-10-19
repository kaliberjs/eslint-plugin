const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('no-duplicate-case', () => {
  it('(no-duplicate-case) should report an error for duplicate case in switch', async () => {
    const code = `switch (a) { case 1: break; case 1: break; }`;
    const result = await lint(code);
    assertHasWarning(result, 'no-duplicate-case');
  });
});
