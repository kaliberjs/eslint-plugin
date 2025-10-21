const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('react/require-render-return', () => {
  it('should warn when render does not return', async () => {
    const result = await lint(`
      import React from 'react';
      class MyComponent extends React.Component {
        render() {}
      }
    `);
    assertHasWarning(result, 'react/require-render-return');
  });
});
