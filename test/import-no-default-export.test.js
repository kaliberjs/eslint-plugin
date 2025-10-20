const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('import/no-default-export', () => {
  it('should warn on default export', async () => {
    const result = await lint('export default 1');
    assertHasWarning(result, 'import/no-default-export');
  });
});
