const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('jsx-a11y/aria-unsupported-elements', () => {
  it('should warn on unsupported aria elements', async () => {
    const result = await lint('<meta charset="UTF-8" aria-hidden="false" />');
    assertHasWarning(result, 'jsx-a11y/aria-unsupported-elements');
  });
});
