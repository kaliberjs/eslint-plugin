const { ESLint } = require('eslint');
const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('path');

const eslint = new ESLint();

async function lint(code, filePath) {
  const results = await eslint.lintText(code, { filePath: filePath || 'src/components/MyComponent.js' });
  return results[0];
}

function assertHasWarning(result, ruleId) {
  const hasWarning = result.messages.some(message => message.ruleId === ruleId);
  assert.ok(hasWarning, `Should have a warning for ${ruleId}`);
}

describe('naming-policy', () => {
  it('(@kaliber/naming-policy) should report an error for invalid component name', async () => {
    const code = `export function Something() {}`;
    const result = await lint(code, 'src/Test.js');
    assertHasWarning(result, '@kaliber/naming-policy');
  });
});
