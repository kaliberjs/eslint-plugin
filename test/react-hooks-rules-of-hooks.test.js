const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(react-hooks/rules-of-hooks) should report an error for invalid hook call', async () => {
  const result = await lint(`
    import React, { useState } from 'react';

    function MyComponent() {
      if (true) {
        const [a, setA] = useState(0);
      }
      return <div />;
    }
  `)
  assertHasWarning(result, 'react-hooks/rules-of-hooks')
})
