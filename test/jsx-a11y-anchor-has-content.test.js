const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('jsx-a11y/anchor-has-content', () => {
  it('should warn on anchor without content', async () => {
    const result = await lint('<a />');
    assertHasWarning(result, 'jsx-a11y/anchor-has-content');
  });
});
