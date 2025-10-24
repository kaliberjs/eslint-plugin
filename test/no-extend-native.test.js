const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('no-extend-native', () => {
  it('(no-extend-native) should report an error for extending native prototypes', async () => {
    const code = `Object.prototype.foo = 'bar';`;
    const result = await lint(code);
    assertHasWarning(result, 'no-extend-native');
  });
});
