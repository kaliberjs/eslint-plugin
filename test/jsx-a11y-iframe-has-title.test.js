const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('jsx-a11y/iframe-has-title', () => {
  it('should warn on iframe without title', async () => {
    const result = await lint('<iframe />');
    assertHasWarning(result, 'jsx-a11y/iframe-has-title');
  });
});
