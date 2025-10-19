const { ESLint } = require('eslint');
const assert = require('node:assert');

const eslint = new ESLint();

async function lint(code) {
  const results = await eslint.lintText(code, { filePath: 'src/components/MyComponent.js' });
  return results[0];
}

function assertHasWarning(result, ruleId) {
  const hasWarning = result.messages.some(message => message.ruleId === ruleId);
  assert.ok(hasWarning, `Should have a warning for ${ruleId}`);
}

module.exports = {
  lint,
  assertHasWarning,
};
