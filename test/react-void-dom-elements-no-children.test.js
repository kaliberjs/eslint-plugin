const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('react/void-dom-elements-no-children', () => {
  it('should warn on children in void elements', async () => {
    const result = await lint('<br>foo</br>');
    assertHasWarning(result, 'react/void-dom-elements-no-children');
  });
});
