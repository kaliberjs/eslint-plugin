const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(react-hooks/exhaustive-deps) should report an error for missing dependency', async () => {
  const result = await lint(`
    import React, { useEffect, useState } from 'react';

    function MyComponent() {
      const [a, setA] = useState(0);
      useEffect(() => {
        console.log(a);
      }, []);
      return <div />;
    }
  `)
  assertHasWarning(result, 'react-hooks/exhaustive-deps')
})
