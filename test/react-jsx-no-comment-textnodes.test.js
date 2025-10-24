const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('react/jsx-no-comment-textnodes', () => {
  it('should warn on comment text nodes in jsx', async () => {
    const result = await lint('<div>// comment</div>');
    assertHasWarning(result, 'react/jsx-no-comment-textnodes');
  });
});
