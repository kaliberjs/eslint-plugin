const { ESLint } = require('eslint');
const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('path');

const eslint = new ESLint();

async function lint(code, filePath) {
  const results = await eslint.lintText(code, { filePath });
  return results[0];
}

function assertHasWarning(result, ruleId) {
  const hasWarning = result.messages.some(message => message.ruleId === ruleId);
  assert.ok(hasWarning, `Should have a warning for ${ruleId}`);
}

describe('eslint.config.mjs', () => {
  it('(@kaliber/no-relative-parent-import) should report an error for relative parent imports', async () => {
    const code = `import Something from '../Something'\n\nexport default Something\n`;
    const result = await lint(code, path.join(process.cwd(), 'src/components/MyComponent.js'));
    assertHasWarning(result, '@kaliber/no-relative-parent-import');
  });

  it('(@kaliber/component-properties) should report an error for components that do not destructure props', async () => {
    const code = `function MyComponent(props) { return <div>{props.name}</div> }\nconsole.log(MyComponent)\n`;
    const result = await lint(code, 'src/components/MyComponent.js');
    assertHasWarning(result, '@kaliber/component-properties');
  });

  it('(eqeqeq) should report an error for using == instead of ===', async () => {
    const code = `const a = 1\nconst b = 2\nif (a == b) {}\n`;
    const result = await lint(code, 'src/components/MyComponent.js');
    assertHasWarning(result, 'eqeqeq');
  });

  it('(react/self-closing-comp) should report an error for non-self-closing components', async () => {
    const code = `function MyComponent() { return <div></div> }\nconsole.log(MyComponent)\n`;
    const result = await lint(code, 'src/components/MyComponent.js');
    assertHasWarning(result, 'react/self-closing-comp');
  });

  it('(import/no-duplicates) should report an error for duplicate imports', async () => {
    const code = `import Something from '../Something'\nimport SomethingElse from '../Something'\n\nconsole.log(Something, SomethingElse)\n`;
    const result = await lint(code, 'src/components/MyComponent.js');
    assertHasWarning(result, 'import/no-duplicates');
  });

  it('(jsx-a11y/alt-text) should report an error for missing alt text on images', async () => {
    const code = `function MyComponent() { return <img src="foo.jpg" /> }\nconsole.log(MyComponent)\n`;
    const result = await lint(code, 'src/components/MyComponent.js');
    assertHasWarning(result, 'jsx-a11y/alt-text');
  });

  it('(brace-style) should report an error for invalid brace style', async () => {
    const code = `if (true) \n{\n}\n`;
    const result = await lint(code, 'src/components/MyComponent.js');
    assertHasWarning(result, 'brace-style');
  });

  it('(indent) should report an error for incorrect indentation', async () => {
    const code = `function MyComponent() {\n console.log('foo');\n}\nconsole.log(MyComponent)\n`;
    const result = await lint(code, 'src/components/MyComponent.js');
    assertHasWarning(result, 'indent');
  });

  it('(no-unused-vars) should report an error for unused variables', async () => {
    const code = `const a = 1;\n`;
    const result = await lint(code, 'src/components/MyComponent.js');
    assertHasWarning(result, 'no-unused-vars');
  });
});