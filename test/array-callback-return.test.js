const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('array-callback-return', () => {
  it('(array-callback-return) should report an error for missing return in array method', async () => {
    const code = `[1, 2, 3].map(x => { x * 2 });`;
    const result = await lint(code);
    assertHasWarning(result, 'array-callback-return');
  });
});
