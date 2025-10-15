const { ESLint } = require('eslint');
const { describe, it } = require('node:test');
const assert = require('node:assert');

const eslint = new ESLint();

async function lint(code, filePath) {
  const results = await eslint.lintText(code, { filePath: filePath || 'src/components/MyComponent.js' });
  return results[0];
}

function assertHasWarning(result, ruleId) {
  const hasWarning = result.messages.some(message => message.ruleId === ruleId);
  assert.ok(hasWarning, `Should have a warning for ${ruleId}`);
}

describe('Missing Rules', () => {
  it('(no-delete-var) should report an error for deleting a variable', async () => {
    const code = `var x; delete x;\n`;
    const result = await lint(code);
    assertHasWarning(result, 'no-delete-var');
  });

  it('(no-dupe-args) should report an error for duplicate arguments in a function', async () => {
    const code = `function a(b, b) {}\n`;
    const result = await lint(code);
    assertHasWarning(result, 'no-dupe-args');
  });

  it('(no-iterator) should report an error for using __iterator__', async () => {
    const code = `const a = {}.__iterator__; console.log(a)\n`;
    const result = await lint(code);
    assertHasWarning(result, 'no-iterator');
  });

  it('(no-label-var) should report an error for label with variable name', async () => {
    const code = `var x; x: while (true) { break x; }\n`;
    const result = await lint(code);
    assertHasWarning(result, 'no-label-var');
  });

  it('(no-labels) should report an error for using labels', async () => {
    const code = `A: while(true) { break A; }\n`;
    const result = await lint(code);
    assertHasWarning(result, 'no-labels');
  });

  it('(no-native-reassign) should report an error for reassigning native objects', async () => {
    const code = `String = 1;\n`;
    const result = await lint(code);
    assertHasWarning(result, 'no-native-reassign');
  });

  it('(no-negated-in-lhs) should report an error for negated in lhs', async () => {
    const code = `if (!'a' in {}) {}\n`;
    const result = await lint(code);
    assertHasWarning(result, 'no-negated-in-lhs');
  });

  it('(no-octal) should report an error for octal literals', async () => {
    const code = `const a = 012;\n`;
    const result = await lint(code);
    assertHasWarning(result, 'no-octal');
  });

  it('(no-octal-escape) should report an error for octal escape sequences', async () => {
    const code = `const a = 'hello \\012';\n`;
    const result = await lint(code);
    assertHasWarning(result, 'no-octal-escape');
  });

  it('(no-restricted-syntax) should report an error for restricted syntax', async () => {
    const code = `with (a) {}\n`;
    const result = await lint(code);
    assertHasWarning(result, 'no-restricted-syntax');
  });

  it('(no-with) should report an error for with statements', async () => {
    const code = `with (a) {}\n`;
    const result = await lint(code);
    assertHasWarning(result, 'no-with');
  });

  it('(require-yield) should report an error for missing yield in generator', async () => {
    const code = `function* a() { return 1; }\n`;
    const result = await lint(code);
    assertHasWarning(result, 'require-yield');
  });

  it('(react/jsx-pascal-case) should report an error for non-pascal case component name', async () => {
    const code = `import React from 'react';\nconst myComponent = () => <div />;\n<myComponent />`;
    const result = await lint(code);
    assertHasWarning(result, 'react/jsx-pascal-case');
  });

  it('(react/jsx-uses-vars) should report an error for unused jsx vars', async () => {
    const code = `import React from 'react';\nconst MyComponent = () => <div />;\n`;
    const result = await lint(code);
    assertHasWarning(result, 'react/jsx-uses-vars');
  });

  it('(react/jsx-wrap-multilines) should report an error for incorrect jsx wrap multilines', async () => {
    const code = `import React from 'react';\nconst MyComponent = () => (<div>\n</div>);\nconsole.log(MyComponent)\n`;
    const result = await lint(code);
    assertHasWarning(result, 'react/jsx-wrap-multilines');
  });
});
