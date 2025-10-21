const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('jsx-a11y/alt-text', () => {
  it('should warn on missing alt text', async () => {
    const result = await lint('<img src="foo.jpg" />');
    assertHasWarning(result, 'jsx-a11y/alt-text');
  });
});
