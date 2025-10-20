const { describe, it } = require('node:test');
const assert = require('node:assert');
const { lint, assertHasWarning } = require('./test-utils');

describe('react/jsx-curly-spacing', () => {
  it('should warn on incorrect spacing in jsx curly braces', async () => {
    const result = await lint('<MyComponent disabled={ foo } />');
    assertHasWarning(result, 'react/jsx-curly-spacing');
  });

  it('should not warn on correct spacing in jsx curly braces', async () => {
    const result = await lint('<MyComponent disabled={foo} />');
    const hasWarning = result.messages.some(m => m.ruleId === 'react/jsx-curly-spacing');
    assert.strictEqual(hasWarning, false);
  });
});
