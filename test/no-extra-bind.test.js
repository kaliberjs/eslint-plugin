const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('no-extra-bind', () => {
  it('(no-extra-bind) should report an error for unnecessary bind', async () => {
    const code = `const x = function() {}.bind(this);`;
    const result = await lint(code);
    assertHasWarning(result, 'no-extra-bind');
  });
});
