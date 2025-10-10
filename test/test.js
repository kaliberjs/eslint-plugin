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

describe('eslint.config.mjs', () => {
  describe('Custom Rules', () => {
    it('(@kaliber/component-properties) should report an error for components that do not destructure props', async () => {
      const code = `function MyComponent(props) { return <div>{props.name}</div> }\nconsole.log(MyComponent)\n`;
      const result = await lint(code);
      assertHasWarning(result, '@kaliber/component-properties');
    });

    it('(@kaliber/layout-class-name) should report an error for invalid layout class name', async () => {
      const code = `<Test layoutClassName='test' />`;
      const result = await lint(code, 'src/Test.js');
      assertHasWarning(result, '@kaliber/layout-class-name');
    });

    it('(@kaliber/naming-policy) should report an error for invalid component name', async () => {
      const code = `export function Something() {}`;
      const result = await lint(code, 'src/Test.js');
      assertHasWarning(result, '@kaliber/naming-policy');
    });

    it('(@kaliber/no-default-export) should report an error for default exports', async () => {
      const code = `export default function MyComponent() {}`;
      const result = await lint(code, 'src/Test.js');
      assertHasWarning(result, '@kaliber/no-default-export');
    });

    it('(@kaliber/no-relative-parent-import) should report an error for relative parent imports', async () => {
      const code = `import Something from '../Something'\n\nexport default Something\n`;
      const result = await lint(code, path.join(process.cwd(), 'src/components/MyComponent.js'));
      assertHasWarning(result, '@kaliber/no-relative-parent-import');
    });

    it('(@kaliber/jsx-key) should report an error for missing key in iterator', async () => {
      const code = `[1, 2, 3].map(x => <div />)`;
      const result = await lint(code);
      assertHasWarning(result, '@kaliber/jsx-key');
    });
  });

  describe('Standard ESLint Rules', () => {
    it('(brace-style) should report an error for invalid brace style', async () => {
      const code = `if (true) \n{\n}\n`;
      const result = await lint(code);
      assertHasWarning(result, 'brace-style');
    });

    it('(indent) should report an error for incorrect indentation', async () => {
      const code = `function MyComponent() {\n console.log('foo');\n}\nconsole.log(MyComponent)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'indent');
    });

    it('(eqeqeq) should report an error for using == instead of ===', async () => {
      const code = `const a = 1\nconst b = 2\nif (a == b) {}\n`;
      const result = await lint(code);
      assertHasWarning(result, 'eqeqeq');
    });

    it('(no-unused-vars) should report an error for unused variables', async () => {
      const code = `const a = 1;\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-unused-vars');
    });

    it('(semi) should report an error for extra semicolons', async () => {
      const code = `const a = 1;;\nconsole.log(a)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'semi');
    });
  });

  describe('React Plugin Rules', () => {
    it('(react/self-closing-comp) should report an error for non-self-closing components', async () => {
      const code = `function MyComponent() { return <div></div> }\nconsole.log(MyComponent)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'react/self-closing-comp');
    });

    it('(react/jsx-key) should be off', async () => {
      const code = `[<div />]`;
      const result = await lint(code);
      const hasWarning = result.messages.some(message => message.ruleId === 'react/jsx-key');
      assert.strictEqual(hasWarning, false, 'Should not have a warning for react/jsx-key');
    });

    it('(react-hooks/rules-of-hooks) should report an error for invalid hook calls', async () => {
      const code = `import { useState } from 'react';\nif (true) { useState(0); }`;
      const result = await lint(code);
      assertHasWarning(result, 'react-hooks/rules-of-hooks');
    });
  });

  describe('Import Plugin Rules', () => {
    it('(import/no-duplicates) should report an error for duplicate imports', async () => {
      const code = `import Something from '../Something'\nimport SomethingElse from '../Something'\n\nconsole.log(Something, SomethingElse)\n`;
      const result = await lint(code, path.join(process.cwd(), 'src/components/MyComponent.js'));
      assertHasWarning(result, 'import/no-duplicates');
    });

    it('(import/no-unresolved) should report an error for unresolved imports', async () => {
      const code = `import Something from './non-existent-file'\n\nconsole.log(Something)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'import/no-unresolved');
    });
  });

  describe('JSX-A11Y Plugin Rules', () => {
    it('(jsx-a11y/alt-text) should report an error for missing alt text on images', async () => {
      const code = `function MyComponent() { return <img src="foo.jpg" /> }\nconsole.log(MyComponent)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'jsx-a11y/alt-text');
    });

    it('(jsx-a11y/anchor-is-valid) should report an error for invalid anchors', async () => {
      const code = `function MyComponent() { return <a href="#" /> }\nconsole.log(MyComponent)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'jsx-a11y/anchor-is-valid');
    });
  });
});