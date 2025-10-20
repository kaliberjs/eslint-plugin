const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('jsx-a11y/aria-props', () => {
  it('should warn on invalid aria prop', async () => {
    const result = await lint('<div aria-foo="bar" />');
    assertHasWarning(result, 'jsx-a11y/aria-props');
  });
});
