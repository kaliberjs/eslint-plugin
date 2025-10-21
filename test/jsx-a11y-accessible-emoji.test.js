const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('jsx-a11y/accessible-emoji', () => {
  it('should warn on inaccessible emoji', async () => {
    const result = await lint('<span>👍</span>');
    assertHasWarning(result, 'jsx-a11y/accessible-emoji');
  });
});
