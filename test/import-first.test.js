const { describe, it } = require('node:test');
const assert = require('node:assert');
const { lint, assertHasWarning } = require('./test-utils');

describe('import/first', () => {
  it('should warn when an import is not at the top of the file', async () => {
    const result = await lint(`
      console.log('foo');
      import foo from 'foo';
    `);
    assertHasWarning(result, 'import/first');
  });

  it('should not warn when imports are at the top of the file', async () => {
    const result = await lint(`
      import foo from 'foo';
      console.log('foo');
    `);
    const hasWarning = result.messages.some(m => m.ruleId === 'import/first');
    assert.strictEqual(hasWarning, false);
  });
});
