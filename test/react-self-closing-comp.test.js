const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('react/self-closing-comp', () => {
  it('should warn on non-self-closing component', async () => {
    const result = await lint('<MyComponent></MyComponent>');
    assertHasWarning(result, 'react/self-closing-comp');
  });
});
