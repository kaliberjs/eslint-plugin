const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('no-array-constructor', () => {
  it('(no-array-constructor) should report an error for using new Array()', async () => {
    const code = `new Array(1, 2, 3)`;
    const result = await lint(code);
    assertHasWarning(result, 'no-array-constructor');
  });
});
