const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('react/jsx-no-duplicate-props', () => {
  it('should warn on duplicate props in jsx', async () => {
    const result = await lint('<MyComponent disabled disabled />');
    assertHasWarning(result, 'react/jsx-no-duplicate-props');
  });
});
