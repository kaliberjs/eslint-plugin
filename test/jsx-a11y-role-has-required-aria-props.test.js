const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('jsx-a11y/role-has-required-aria-props', () => {
  it('should warn on missing required aria props', async () => {
    const result = await lint('<div role="checkbox" />');
    assertHasWarning(result, 'jsx-a11y/role-has-required-aria-props');
  });
});
