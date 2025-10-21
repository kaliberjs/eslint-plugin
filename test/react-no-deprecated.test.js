const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('react/no-deprecated', () => {
  it('should warn on using deprecated methods', async () => {
    const result = await lint("import React from 'react'; React.render(<div />, document.body);");
    assertHasWarning(result, 'react/no-deprecated');
  });
});
