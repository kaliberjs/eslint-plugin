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

describe('no-relative-parent-import', () => {
  it('(@kaliber/no-relative-parent-import) should report an error for relative parent imports', async () => {
    const code = `import Something from '../Something'\n\nexport default Something\n`;
    const result = await lint(code, path.join(process.cwd(), 'src/components/MyComponent.js'));
    assertHasWarning(result, '@kaliber/no-relative-parent-import');
  });
});
