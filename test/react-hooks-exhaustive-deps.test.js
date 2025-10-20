const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('react-hooks/exhaustive-deps', () => {
  it('should warn on missing dependency', async () => {
    const result = await lint(`
      import { useEffect } from 'react';
      function MyComponent() {
        const [foo, setFoo] = useState();
        useEffect(() => {
          console.log(foo);
        }, []);
      }
    `);
    assertHasWarning(result, 'react-hooks/exhaustive-deps');
  });
});
