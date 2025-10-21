const { describe, it } = require('node:test');
const assert = require('node:assert');
const { lint, assertHasWarning } = require('./test-utils');

describe('react/jsx-equals-spacing', () => {
  it('should warn on incorrect spacing around equals in jsx', async () => {
    const result = await lint('<MyComponent disabled = {true} />');
    assertHasWarning(result, 'react/jsx-equals-spacing');
  });

  it('should not warn on correct spacing around equals in jsx', async () => {
    const result = await lint('<MyComponent disabled={true} />');
    const hasWarning = result.messages.some(m => m.ruleId === 'react/jsx-equals-spacing');
    assert.strictEqual(hasWarning, false);
  });
});
