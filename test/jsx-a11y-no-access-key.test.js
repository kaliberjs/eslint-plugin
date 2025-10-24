const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('jsx-a11y/no-access-key', () => {
  it('should warn on access key', async () => {
    const result = await lint('<div accessKey="h" />');
    assertHasWarning(result, 'jsx-a11y/no-access-key');
  });
});
