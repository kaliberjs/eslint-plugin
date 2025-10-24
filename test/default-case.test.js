const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('default-case', () => {
  it('(default-case) should report an error for switch statement without default', async () => {
    const code = `switch (foo) { case 1: break; }`;
    const result = await lint(code);
    assertHasWarning(result, 'default-case');
  });
});
