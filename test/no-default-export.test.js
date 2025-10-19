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

describe('no-default-export', () => {
  it('(@kaliber/no-default-export) should report an error for default exports', async () => {
    const code = `export default function MyComponent() {}`;
    const result = await lint(code, 'src/Test.js');
    assertHasWarning(result, '@kaliber/no-default-export');
  });
});
