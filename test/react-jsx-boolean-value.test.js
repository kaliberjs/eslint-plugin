const { describe, it } = require('node:test');
const assert = require('node:assert');
const { lint, assertHasWarning } = require('./test-utils');

describe('react/jsx-boolean-value', () => {
  it('should warn when a boolean prop is set to true', async () => {
    const result = await lint('<MyComponent disabled={true} />');
    assertHasWarning(result, 'react/jsx-boolean-value');
  });

  it('should not warn when a boolean prop is set correctly', async () => {
    const result = await lint('<MyComponent disabled />');
    const hasWarning = result.messages.some(m => m.ruleId === 'react/jsx-boolean-value');
    assert.strictEqual(hasWarning, false);
  });
});
