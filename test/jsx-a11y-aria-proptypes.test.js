const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('jsx-a11y/aria-proptypes', () => {
  it('should warn on invalid aria proptype', async () => {
    const result = await lint('<div aria-hidden="foo" />');
    assertHasWarning(result, 'jsx-a11y/aria-proptypes');
  });
});
