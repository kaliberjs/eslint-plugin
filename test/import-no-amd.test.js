const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('import/no-amd', () => {
  it('should warn on define', async () => {
    const result = await lint('define([], function() {});');
    assertHasWarning(result, 'import/no-amd');
  });

  it('should warn on require', async () => {
    const result = await lint('require([], function() {});');
    assertHasWarning(result, 'import/no-amd');
  });
});
