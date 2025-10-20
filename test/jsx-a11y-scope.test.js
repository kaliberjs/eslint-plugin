const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('jsx-a11y/scope', () => {
  it('should warn on invalid scope', async () => {
    const result = await lint('<div scope="col" />');
    assertHasWarning(result, 'jsx-a11y/scope');
  });
});
