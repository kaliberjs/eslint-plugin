const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('jsx-a11y/anchor-is-valid', () => {
  it('should warn on invalid anchor', async () => {
    const result = await lint('<a href="#" />');
    assertHasWarning(result, 'jsx-a11y/anchor-is-valid');
  });
});
