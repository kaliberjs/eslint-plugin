const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('react/jsx-no-undef', () => {
  it('should warn on undefined component', async () => {
    const result = await lint('<MyUndefinedComponent />');
    assertHasWarning(result, 'react/jsx-no-undef');
  });
});
