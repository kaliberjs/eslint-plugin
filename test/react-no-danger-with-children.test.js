const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('react/no-danger-with-children', () => {
  it('should warn on using children with dangerouslySetInnerHTML', async () => {
    const result = await lint('<div dangerouslySetInnerHTML={{ __html: "foo" }}>bar</div>');
    assertHasWarning(result, 'react/no-danger-with-children');
  });
});
