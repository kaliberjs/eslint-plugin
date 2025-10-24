const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('import/no-webpack-loader-syntax', () => {
  it('should warn on webpack loader syntax', async () => {
    const result = await lint("import foo from 'my-loader!foo';");
    assertHasWarning(result, 'import/no-webpack-loader-syntax');
  });
});
