const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(react/require-render-return) should report an error for missing render return', async () => {
  const result = await lint(`
    import React from 'react';

    class MyComponent extends React.Component {
      render() {}
    }
  `)
  assertHasWarning(result, 'react/require-render-return')
})
