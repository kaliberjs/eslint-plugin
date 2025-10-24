const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('jsx-a11y/html-has-lang', () => {
  it('should warn on html without lang', async () => {
    const result = await lint('<html />');
    assertHasWarning(result, 'jsx-a11y/html-has-lang');
  });
});
