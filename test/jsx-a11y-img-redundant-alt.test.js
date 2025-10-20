const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('jsx-a11y/img-redundant-alt', () => {
  it('should warn on redundant alt text', async () => {
    const result = await lint('<img alt="picture" />');
    assertHasWarning(result, 'jsx-a11y/img-redundant-alt');
  });
});
