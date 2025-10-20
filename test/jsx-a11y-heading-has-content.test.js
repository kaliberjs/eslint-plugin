const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('jsx-a11y/heading-has-content', () => {
  it('should warn on heading without content', async () => {
    const result = await lint('<h1 />');
    assertHasWarning(result, 'jsx-a11y/heading-has-content');
  });
});
