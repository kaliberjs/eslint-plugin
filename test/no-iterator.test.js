const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('no-iterator', () => {
  it('(no-iterator) should report an error for using __iterator__', async () => {
    const code = `const obj = { __iterator__: () => {} };`;
    const result = await lint(code);
    assertHasWarning(result, 'no-iterator');
  });
});
