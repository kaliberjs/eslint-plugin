const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('react/jsx-tag-spacing', () => {
  it('should warn on invalid tag spacing', async () => {
    const result = await lint('< MyComponent />');
    assertHasWarning(result, 'react/jsx-tag-spacing');
  });
});
