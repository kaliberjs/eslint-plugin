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

describe('component-properties', () => {
  it('(@kaliber/component-properties) should report an error for components that do not destructure props', async () => {
    const code = `function MyComponent(props) { return <div>{props.name}</div> }\nconsole.log(MyComponent)\n`;
    const result = await lint(code);
    assertHasWarning(result, '@kaliber/component-properties');
  });
});
