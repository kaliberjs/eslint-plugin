const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('react/jsx-no-target-blank', () => {
  it('should warn on target blank without rel', async () => {
    const result = await lint('<a target="_blank" href="https://example.com"></a>');
    assertHasWarning(result, 'react/jsx-no-target-blank');
  });
});
