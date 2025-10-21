const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('import/no-duplicates', () => {
  it('should warn on duplicate imports', async () => {
    const result = await lint(`
      import { a } from './foo';
      import { b } from './foo';
    `);
    assertHasWarning(result, 'import/no-duplicates');
  });
});
