const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('import/no-unresolved', () => {
  it('should warn on unresolved import', async () => {
    const result = await lint("import foo from './bar';");
    assertHasWarning(result, 'import/no-unresolved');
  });
});
