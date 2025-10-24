const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('react/jsx-wrap-multilines', () => {
  it('should warn on missing parens', async () => {
    const result = await lint(`
      const x = <div>
        <p>foo</p>
      </div>;
    `);
    assertHasWarning(result, 'react/jsx-wrap-multilines');
  });
});
