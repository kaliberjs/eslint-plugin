const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('jsx-a11y/aria-role', () => {
  it('should warn on invalid aria role', async () => {
    const result = await lint('<div role="foo" />');
    assertHasWarning(result, 'jsx-a11y/aria-role');
  });
});
