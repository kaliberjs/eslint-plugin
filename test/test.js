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
      const code = `if (true)\n{\n}\n`;
      const result = await lint(code);
      assertHasWarning(result, 'brace-style');
    });

    it('(indent) should report an error for incorrect indentation', async () => {
      const code = `function MyComponent() {\n console.log('foo');\n}\nconsole.log(MyComponent)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'indent');
    });

    it('(accessor-pairs) should report an error for missing getter', async () => {
      const code = `const obj = { set a(value) {} }; console.log(obj)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'accessor-pairs');
    });

    it('(array-callback-return) should report an error for missing return in array callback', async () => {
      const code = `[1, 2, 3].map(x => { console.log(x) });\n`;
      const result = await lint(code);
      assertHasWarning(result, 'array-callback-return');
    });

    it('(arrow-spacing) should report an error for incorrect arrow spacing', async () => {
      const code = `const a = ()=> {}; console.log(a)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'arrow-spacing');
    });

    it('(block-spacing) should report an error for incorrect block spacing', async () => {
      const code = `function a() {console.log('foo')}\n`;
      const result = await lint(code);
      assertHasWarning(result, 'block-spacing');
    });

    it('(comma-dangle) should report an error for dangling comma', async () => {
      const code = `const obj = { a: 1, };\n`;
      const result = await lint(code);
      assertHasWarning(result, 'comma-dangle');
    });

    it('(comma-spacing) should report an error for incorrect comma spacing', async () => {
      const code = `const arr = [1 , 2]; console.log(arr)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'comma-spacing');
    });

    it('(comma-style) should report an error for incorrect comma style', async () => {
      const code = `const arr = [1\n, 2]; console.log(arr)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'comma-style');
    });

    it('(default-case) should report an error for missing default case', async () => {
      const code = `switch ('a') { case 'a': break; }\n`;
      const result = await lint(code);
      assertHasWarning(result, 'default-case');
    });

    it('(dot-location) should report an error for incorrect dot location', async () => {
      const code = `Promise.resolve().\nthen(() => console.log('foo'))\n`;
      const result = await lint(code);
      assertHasWarning(result, 'dot-location');
    });

    it('(eol-last) should report an error for missing newline at end of file', async () => {
      const code = `const a = 1;`;
      const result = await lint(code);
      assertHasWarning(result, 'eol-last');
    });

    it('(eqeqeq) should report an error for using == instead of ===', async () => {
      const code = `const a = 1\nconst b = 2\nif (a == b) {}\n`;
      const result = await lint(code);
      assertHasWarning(result, 'eqeqeq');
    });

    it('(key-spacing) should report an error for incorrect key spacing', async () => {
      const code = `const obj = { a : 1 }; console.log(obj)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'key-spacing');
    });

    it('(keyword-spacing) should report an error for incorrect keyword spacing', async () => {
      const code = `if(true) {}\n`;
      const result = await lint(code);
      assertHasWarning(result, 'keyword-spacing');
    });

    it('(new-parens) should report an error for missing parens on constructor', async () => {
      const code = `function MyClass() {}\nconst instance = new MyClass; console.log(instance)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'new-parens');
    });

    it('(no-array-constructor) should report an error for using array constructor', async () => {
      const code = `const arr = new Array(1, 2, 3); console.log(arr)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-array-constructor');
    });

    it('(no-caller) should report an error for using arguments.caller', async () => {
      const code = `function a() { console.log(arguments.caller); } a()\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-caller');
    });

    it('(no-class-assign) should report an error for reassigning class', async () => {
      const code = `class A {}; A = 1; console.log(A)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-class-assign');
    });

    it('(no-compare-neg-zero) should report an error for comparing with -0', async () => {
      const code = `if (1 > -0) {}\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-compare-neg-zero');
    });

    it('(no-cond-assign) should report an error for assignment in condition', async () => {
      const code = `let a;\nif (a = 1) {} console.log(a)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-cond-assign');
    });

    it('(no-const-assign) should report an error for reassigning const', async () => {
      const code = `const a = 1; a = 2; console.log(a)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-const-assign');
    });

    it('(no-constant-condition) should report an error for constant condition', async () => {
      const code = `if (true) {}\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-constant-condition');
    });

    it('(no-control-regex) should report an error for control regex', async () => {
      const code = `const regex = new RegExp('\\x1f'); console.log(regex)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-control-regex');
    });

    it('(no-debugger) should report an error for debugger statement', async () => {
      const code = `debugger;\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-debugger');
    });

    it('(no-dupe-class-members) should report an error for duplicate class members', async () => {
      const code = `class A { a() {} a() {} } console.log(A)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-dupe-class-members');
    });

    it('(no-dupe-keys) should report an error for duplicate keys in object', async () => {
      const code = `const obj = { a: 1, a: 2 }; console.log(obj)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-dupe-keys');
    });

    it('(no-duplicate-case) should report an error for duplicate case in switch', async () => {
      const code = `switch (1) { case 1: break; case 1: break; }\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-duplicate-case');
    });

    it('(no-empty-character-class) should report an error for empty character class in regex', async () => {
      const code = `const regex = /^[]/; console.log(regex)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-empty-character-class');
    });

    it('(no-empty-pattern) should report an error for empty pattern', async () => {
      const code = `const {} = {};\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-empty-pattern');
    });

    it('(no-eval) should report an error for using eval', async () => {
      const code = `eval('1 + 1');\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-eval');
    });

    it('(no-ex-assign) should report an error for reassigning exception', async () => {
      const code = `try {} catch (e) { e = 1; }\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-ex-assign');
    });

    it('(no-extend-native) should report an error for extending native objects', async () => {
      const code = `Object.prototype.a = 1;\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-extend-native');
    });

    it('(no-extra-bind) should report an error for extra bind', async () => {
      const code = `const a = (function() {}).bind(this); console.log(a)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-extra-bind');
    });

    it('(no-extra-boolean-cast) should report an error for extra boolean cast', async () => {
      const code = `if (!!true) {}\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-extra-boolean-cast');
    });

    it('(no-extra-label) should report an error for extra label', async () => {
      const code = `A: while (true) { break A; }\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-extra-label');
    });

    it('(no-extra-parens) should report an error for extra parens', async () => {
      const code = `const a = (function() {});\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-extra-parens');
    });

    it('(no-fallthrough) should report an error for fallthrough in switch', async () => {
      const code = `switch (1) { case 1: console.log(1); case 2: break; }\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-fallthrough');
    });

    it('(no-floating-decimal) should report an error for floating decimal', async () => {
      const code = `const a = .5; console.log(a)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-floating-decimal');
    });

    it('(no-func-assign) should report an error for reassigning function', async () => {
      const code = `function a() {}; a = 1; console.log(a)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-func-assign');
    });

    it('(no-global-assign) should report an error for reassigning global', async () => {
      const code = `Object = 1;\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-global-assign');
    });

    it('(no-implied-eval) should report an error for implied eval', async () => {
      const code = `setTimeout("alert('Hi!')", 100);\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-implied-eval');
    });

    it('(no-invalid-regexp) should report an error for invalid regex', async () => {
      const code = `const regex = new RegExp('([)'); console.log(regex)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-invalid-regexp');
    });

    it('(no-irregular-whitespace) should report an error for irregular whitespace', async t => {
      const code = 'var a = a\u2028';
      const result = await lint(code);
      assertHasWarning(result, 'no-irregular-whitespace');
    });

    it('(no-lone-blocks) should report an error for lone blocks', async () => {
      const code = `{ console.log(1) }\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-lone-blocks');
    });

    it('(no-loop-func) should report an error for function in loop', async () => {
      const code = `
        for (var i = 0; i < 10; i++) {
          const a = () => i;
          a();
        }
      `;
      const result = await lint(code);
      assertHasWarning(result, 'no-loop-func');
    });

    it('(no-mixed-spaces-and-tabs) should report an error for mixed spaces and tabs', async () => {
      const code = `\t console.log(1)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-mixed-spaces-and-tabs');
    });

    it('(no-path-concat) should report an error for path concat', async () => {
      const code = `const a = __dirname + '/foo.js'; console.log(a)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-path-concat');
    });

    it('(no-proto) should report an error for using __proto__', async () => {
      const code = `const a = {}.__proto__; console.log(a)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-proto');
    });

    it('(no-return-assign) should report an error for assignment in return', async () => {
      const code = `function a() { let b; return b = 1; } a()\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-return-assign');
    });

    it('(no-return-await) should report an error for return await', async () => {
      const code = `async function a() { return await Promise.resolve(1); } a()\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-return-await');
    });

    it('(no-trailing-spaces) should report an error for trailing spaces', async () => {
      const code = `const a = 1; \nconsole.log(a)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-trailing-spaces');
    });

    it('(no-unneeded-ternary) should report an error for unneeded ternary', async () => {
      const code = `const a = 1 > 0 ? true : false; console.log(a)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-unneeded-ternary');
    });

    it('(no-unsafe-negation) should report an error for unsafe negation', async () => {
      const code = `if (!1 in [1,2]) {}\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-unsafe-negation');
    });

    it('(no-useless-return) should report an error for useless return', async () => {
      const code = `function a() { return; } a()\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-useless-return');
    });

    it('(object-curly-spacing) should report an error for incorrect object curly spacing', async () => {
      const code = `const obj = {a: 1}; console.log(obj)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'object-curly-spacing');
    });

    it('(object-shorthand) should report an error for no object shorthand', async () => {
      const code = `const a = 1; const obj = { a: a }; console.log(obj)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'object-shorthand');
    });

    it('(quotes) should report an error for incorrect quotes', async () => {
      const code = `const a = "hello"; console.log(a)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'quotes');
    });

    it('(semi) should report an error for extra semicolons', async () => {
      const code = `const a = 1;;\nconsole.log(a)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'semi');
    });

    it('(semi-spacing) should report an error for incorrect semi spacing', async () => {
      const code = `const a = 1 ; console.log(a)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'semi-spacing');
    });

    it('(space-before-blocks) should report an error for incorrect space before blocks', async () => {
      const code = `function a(){}\n`;
      const result = await lint(code);
      assertHasWarning(result, 'space-before-blocks');
    });

    it('(space-before-function-paren) should report an error for incorrect space before function paren', async () => {
      const code = `function a () {}\n`;
      const result = await lint(code);
      assertHasWarning(result, 'space-before-function-paren');
    });

    it('(space-infix-ops) should report an error for incorrect space infix ops', async () => {
      const code = `const a = 1+2; console.log(a)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'space-infix-ops');
    });

    it('(space-unary-ops) should report an error for incorrect space unary ops', async () => {
      const code = `let a = 1; a ++; console.log(a)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'space-unary-ops');
    });

    it('(template-tag-spacing) should report an error for incorrect template tag spacing', async () => {
      const code = `function a() {} a \`hello\`\n`;
      const result = await lint(code);
      assertHasWarning(result, 'template-tag-spacing');
    });

    it('(no-mixed-operators) should report an error for mixed operators', async () => {
      const code = `const a = 1 && 2 || 3;\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-mixed-operators');
    });

    it('(no-multi-str) should report an error for multi-line string', async () => {
      const code = `const a = 'hello \\\n world'; console.log(a)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-multi-str');
    });

    it('(no-new-func) should report an error for new Function', async () => {
      const code = `const a = new Function('a', 'b', 'return a + b'); console.log(a)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-new-func');
    });

    it('(no-new-object) should report an error for new Object', async () => {
      const code = `const a = new Object(); console.log(a)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-new-object');
    });

    it('(no-new-symbol) should report an error for new Symbol', async () => {
      const code = `const a = new Symbol('a'); console.log(a)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-new-symbol');
    });

    it('(no-new-wrappers) should report an error for new String', async () => {
      const code = `const a = new String('hello'); console.log(a)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-new-wrappers');
    });

    it('(no-obj-calls) should report an error for calling Math as function', async () => {
      const code = `const a = Math(); console.log(a)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-obj-calls');
    });

    it('(no-redeclare) should report an error for redeclaring variable', async () => {
      const code = `var a = 1; var a = 2;\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-redeclare');
    });

    it('(no-regex-spaces) should report an error for regex spaces', async () => {
      const code = `const a = /hello   world/; console.log(a)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-regex-spaces');
    });

    it('(no-restricted-globals) should report an error for restricted globals', async () => {
      const code = `console.log(event)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-restricted-globals');
    });

    it('(no-restricted-properties) should report an error for restricted properties', async () => {
      const code = `require.ensure([])\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-restricted-properties');
    });


    it('(no-script-url) should report an error for script url', async () => {
      const code = `location.href = 'javascript:void(0)'\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-script-url');
    });

    it('(no-self-assign) should report an error for self assign', async () => {
      const code = `let a; a = a;\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-self-assign');
    });

    it('(no-self-compare) should report an error for self compare', async () => {
      const code = `let a; if (a === a) {}\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-self-compare');
    });

    it('(no-shadow-restricted-names) should report an error for shadowing restricted names', async () => {
      const code = `function undefined() {}\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-shadow-restricted-names');
    });

    it('(no-sparse-arrays) should report an error for sparse arrays', async () => {
      const code = `const a = [1, , 3]; console.log(a)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-sparse-arrays');
    });

    it('(no-template-curly-in-string) should report an error for template curly in string', async () => {
      const code = `const a = 'hello \${world}'; console.log(a)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-template-curly-in-string');
    });

    it('(no-this-before-super) should report an error for this before super', async () => {
      const code = `class A extends B { constructor() { this.a = 1; super(); } }\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-this-before-super');
    });

    it('(no-throw-literal) should report an error for throwing literal', async () => {
      const code = `throw 'error'\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-throw-literal');
    });

    it('(no-undef) should report an error for undefined variable', async () => {
      const code = `console.log(a)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-undef');
    });

    it('(no-unexpected-multiline) should report an error for unexpected multiline', async () => {
      const code = `const a = 1\n(2)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-unexpected-multiline');
    });

    it('(no-unreachable) should report an error for unreachable code', async () => {
      const code = `function a() { return; console.log(1); } a()\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-unreachable');
    });

    it('(no-unused-expressions) should report an error for unused expressions', async () => {
      const code = `1;\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-unused-expressions');
    });

    it('(no-unused-labels) should report an error for unused labels', async () => {
      const code = `A: console.log(1)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-unused-labels');
    });

    it('(no-unused-vars) should report an error for unused variables', async () => {
      const code = `const a = 1;\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-unused-vars');
    });

    it('(no-use-before-define) should report an error for use before define', async () => {
      const code = `console.log(a); const a = 1;\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-use-before-define');
    });

    it('(no-useless-computed-key) should report an error for useless computed key', async () => {
      const code = `const a = { ['a']: 1 }; console.log(a)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-useless-computed-key');
    });

    it('(no-useless-concat) should report an error for useless concat', async () => {
      const code = `const a = 'a' + 'b'; console.log(a)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-useless-concat');
    });

    it('(no-useless-constructor) should report an error for useless constructor', async () => {
      const code = `class A { constructor() {} } console.log(A)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-useless-constructor');
    });

    it('(no-useless-escape) should report an error for useless escape', async () => {
      const code = `const a = /\\a/;\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-useless-escape');
    });

    it('(no-whitespace-before-property) should report an error for whitespace before property', async () => {
      const code = `const a = { b: 1 }; console.log(a. b)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'no-whitespace-before-property');
    });

    it('(radix) should report an error for missing radix in parseInt', async () => {
      const code = `parseInt('10');\n`;
      const result = await lint(code);
      assertHasWarning(result, 'radix');
    });

    it('(rest-spread-spacing) should report an error for incorrect rest spread spacing', async () => {
      const code = `const a = {... { b: 1 } }; console.log(a)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'rest-spread-spacing');
    });

    it('(strict) should report an error for strict mode', async () => {
      const code = `'use strict';\n`;
      const result = await lint(code);
      assertHasWarning(result, 'strict');
    });

    it('(unicode-bom) should report an error for unicode bom', async () => {
      const code = `\uFEFFconst a = 1;\n`;
      const result = await lint(code);
      assertHasWarning(result, 'unicode-bom');
    });

    it('(use-isnan) should report an error for using == with NaN', async () => {
      const code = `if (1 == NaN) {}\n`;
      const result = await lint(code);
      assertHasWarning(result, 'use-isnan');
    });

    it('(valid-typeof) should report an error for invalid typeof', async () => {
      const code = `typeof 1 === 'invalid'\n`;
      const result = await lint(code);
      assertHasWarning(result, 'valid-typeof');
    });
  });

  describe('Import Plugin Rules', () => {
    it('(import/first) should report an error for import not at top', async () => {
      const code = `console.log(1);\nimport a from 'a';\n`;
      const result = await lint(code);
      assertHasWarning(result, 'import/first');
    });

    it('(import/no-amd) should report an error for amd import', async () => {
      const code = `define(['a'], function (a) {});\n`;
      const result = await lint(code);
      assertHasWarning(result, 'import/no-amd');
    });

    it('(import/no-webpack-loader-syntax) should report an error for webpack loader syntax', async () => {
      const code = `import a from 'style-loader!css-loader!./styles.css';\n`;
      const result = await lint(code);
      assertHasWarning(result, 'import/no-webpack-loader-syntax');
    });

    it('(import/no-duplicates) should report an error for duplicate imports', async () => {
      const code = `import Something from '../Something'\nimport SomethingElse from '../Something'\n\nconsole.log(Something, SomethingElse)\n`;
      const result = await lint(code, path.join(process.cwd(), 'src/components/MyComponent.js'));
      assertHasWarning(result, 'import/no-duplicates');
    });

    it('(import/export) should report an error for export issues', async () => {
      const code = `export { bar } from './fixtures/export-source.js';\n`;
      const result = await lint(code, 'test/fixtures/export-re-export.js');
      assertHasWarning(result, 'import/export');
    });

    it('(import/default) should report an error for default import issues', async () => {
      const code = `import a from './fixtures/non-existent-file-with-named.js';\nconsole.log(a)\n`;
      const result = await lint(code, 'test/b.js');
      assertHasWarning(result, 'import/default');
    });

    it('(import/no-unresolved) should report an error for unresolved imports', async () => {
      const code = `import Something from './non-existent-file'\n\nconsole.log(Something)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'import/no-unresolved');
    });

    it('(import/named) should report an error for named import issues', async () => {
      const code = `import { b } from './fixtures/non-existent-file-with-named.js';\nconsole.log(b)\n`;
      const result = await lint(code, 'test/c.js');
      assertHasWarning(result, 'import/named');
    });
  });

  describe('React Plugin Rules', () => {
    it('(react/jsx-boolean-value) should report an error for boolean value in jsx', async () => {
      const code = `import React from 'react';\nconst MyComponent = () => <div a={true} />;\nconsole.log(MyComponent)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'react/jsx-boolean-value');
    });

    it('(react/jsx-curly-spacing) should report an error for curly spacing in jsx', async () => {
      const code = `import React from 'react';\nconst MyComponent = () => <div a={ 1 } />;\nconsole.log(MyComponent)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'react/jsx-curly-spacing');
    });

    it('(react/jsx-equals-spacing) should report an error for equals spacing in jsx', async () => {
      const code = `import React from 'react';\nconst MyComponent = () => <div a = {1} />;\nconsole.log(MyComponent)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'react/jsx-equals-spacing');
    });

    it('(react/jsx-indent) should report an error for incorrect jsx indent', async () => {
      const code = `import React from 'react';\nconst MyComponent = () => <div>\n <div />\n</div>;\nconsole.log(MyComponent)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'react/jsx-indent');
    });

    it('(react/jsx-indent-props) should report an error for incorrect jsx prop indent', async () => {
      const code = `import React from 'react';\nconst MyComponent = () => <div\n a={1}\n />;\nconsole.log(MyComponent)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'react/jsx-indent-props');
    });

    it('(react/jsx-no-comment-textnodes) should report an error for comment in jsx', async () => {
      const code = `import React from 'react';\nconst MyComponent = () => <div>// a comment</div>;\nconsole.log(MyComponent)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'react/jsx-no-comment-textnodes');
    });

    it('(react/jsx-no-duplicate-props) should report an error for duplicate props in jsx', async () => {
      const code = `import React from 'react';\nconst MyComponent = () => <div a={1} a={2} />;\nconsole.log(MyComponent)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'react/jsx-no-duplicate-props');
    });

    it('(react/jsx-no-target-blank) should report an error for target blank without noopener', async () => {
      const code = `import React from 'react';\nconst MyComponent = () => <a target='_blank' href='http://example.com'></a>;\nconsole.log(MyComponent)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'react/jsx-no-target-blank');
    });

    it('(react/jsx-no-undef) should report an error for undefined component in jsx', async () => {
      const code = `import React from 'react';\n<MyUndefinedComponent />;\n`;
      const result = await lint(code);
      assertHasWarning(result, 'react/jsx-no-undef');
    });

    // it('(react/jsx-pascal-case) should report an error for non-pascal case component name', async () => {
    //   const code = `import React from 'react';\nconst myComponent = () => <div />;\n<myComponent />`;
    //   const result = await lint(code);
    //   assertHasWarning(result, 'react/jsx-pascal-case');
    // });

    it('(react/jsx-tag-spacing) should report an error for incorrect tag spacing', async () => {
      const code = `import React from 'react';\nconst MyComponent = () => < div />;\nconsole.log(MyComponent)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'react/jsx-tag-spacing');
    });

    // it('(react/jsx-wrap-multilines) should report an error for incorrect jsx wrap multilines', async () => {
    //   const code = `import React from 'react';\nconst MyComponent = () => <div>\n</div>;\nconsole.log(MyComponent)\n`;
    //   const result = await lint(code);
    //   assertHasWarning(result, 'react/jsx-wrap-multilines');
    // });

    it('(react/no-danger-with-children) should report an error for using danger with children', async () => {
      const code = `const MyComponent = () => <div dangerouslySetInnerHTML={{ __html: 'hello' }}>world</div>;\nconsole.log(MyComponent)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'react/no-danger-with-children');
    });

    it('(react/no-deprecated) should report an error for using deprecated methods', async () => {
      const code = `import React from 'react';\nReact.render(<div />, document.body)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'react/no-deprecated');
    });

    it('(react/no-direct-mutation-state) should report an error for direct mutation of state', async () => {
      const code = `import React from 'react';\nclass MyComponent extends React.Component { componentDidMount() { this.state.a = 1; } render() { return <div /> } }\n`;
      const result = await lint(code);
      assertHasWarning(result, 'react/no-direct-mutation-state');
    });

    it('(react/no-unused-prop-types) should report an error for unused prop types', async () => {
      const code = `function MyComponent({ name }) { return <div>{name}</div> }\nMyComponent.propTypes = { name: React.PropTypes.string, age: React.PropTypes.number };\n`;
      const result = await lint(code);
      assertHasWarning(result, 'react/no-unused-prop-types');
    });

    it('(react/prop-types) should report an error for missing prop types', async () => {
      const code = `function MyComponent(props) { return <div>{props.name}</div> }\nMyComponent.propTypes = {}\n`;
      const result = await lint(code);
      assertHasWarning(result, 'react/prop-types');
    });

    it('(react/require-render-return) should report an error for missing return in render', async () => {
      const code = `class MyComponent extends React.Component { render() { } }\n`;
      const result = await lint(code);
      assertHasWarning(result, 'react/require-render-return');
    });

    it('(react/self-closing-comp) should report an error for non-self-closing components', async () => {
      const code = `function MyComponent() { return <div></div> }\nconsole.log(MyComponent)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'react/self-closing-comp');
    });

    it('(react/void-dom-elements-no-children) should report an error for void elements with children', async () => {
      const code = `<br>hello</br>\n`;
      const result = await lint(code);
      assertHasWarning(result, 'react/void-dom-elements-no-children');
    });
  });

  describe('React Hooks Plugin Rules', () => {
    it('(react-hooks/rules-of-hooks) should report an error for invalid hook calls', async () => {
      const code = `import { useState } from 'react';\nif (true) { useState(0); }\n`;
      const result = await lint(code);
      assertHasWarning(result, 'react-hooks/rules-of-hooks');
    });

    it('(react-hooks/exhaustive-deps) should report an error for missing dependency in useEffect', async () => {
      const code = `import { useEffect, useState } from 'react';\nfunction MyComponent() { const [a, setA] = useState(0); useEffect(() => { console.log(a) }, []) }\n`;
      const result = await lint(code);
      assertHasWarning(result, 'react-hooks/exhaustive-deps');
    });
  });

  describe('JSX-A11Y Plugin Rules', () => {
    it('(jsx-a11y/accessible-emoji) should report an error for inaccessible emoji', async () => {
      const code = `<span>🤔</span>\n`;
      const result = await lint(code);
      assertHasWarning(result, 'jsx-a11y/accessible-emoji');
    });

    it('(jsx-a11y/alt-text) should report an error for missing alt text on images', async () => {
      const code = `function MyComponent() { return <img src="foo.jpg" /> }\nconsole.log(MyComponent)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'jsx-a11y/alt-text');
    });

    it('(jsx-a11y/anchor-has-content) should report an error for anchor without content', async () => {
      const code = `<a />\n`;
      const result = await lint(code);
      assertHasWarning(result, 'jsx-a11y/anchor-has-content');
    });

    it('(jsx-a11y/anchor-is-valid) should report an error for invalid anchors', async () => {
      const code = `function MyComponent() { return <a href="#" /> }\nconsole.log(MyComponent)\n`;
      const result = await lint(code);
      assertHasWarning(result, 'jsx-a11y/anchor-is-valid');
    });

    it('(jsx-a11y/aria-activedescendant-has-tabindex) should report an error for aria-activedescendant without tabindex', async () => {
      const code = `<div aria-activedescendant='test' />\n`;
      const result = await lint(code);
      assertHasWarning(result, 'jsx-a11y/aria-activedescendant-has-tabindex');
    });

    it('(jsx-a11y/aria-props) should report an error for invalid aria props', async () => {
      const code = `<div aria-invalid-prop='true' />\n`;
      const result = await lint(code);
      assertHasWarning(result, 'jsx-a11y/aria-props');
    });

    it('(jsx-a11y/aria-proptypes) should report an error for invalid aria proptypes', async () => {
      const code = `<div aria-hidden='not-a-boolean' />\n`;
      const result = await lint(code);
      assertHasWarning(result, 'jsx-a11y/aria-proptypes');
    });

    it('(jsx-a11y/aria-role) should report an error for invalid aria role', async () => {
      const code = `<div role='invalid-role' />\n`;
      const result = await lint(code);
      assertHasWarning(result, 'jsx-a11y/aria-role');
    });

    it('(jsx-a11y/aria-unsupported-elements) should report an error for unsupported aria elements', async () => {
      const code = `<meta charset='UTF-8' aria-hidden='true' />\n`;
      const result = await lint(code);
      assertHasWarning(result, 'jsx-a11y/aria-unsupported-elements');
    });

    it('(jsx-a11y/heading-has-content) should report an error for heading without content', async () => {
      const code = `<h1 />\n`;
      const result = await lint(code);
      assertHasWarning(result, 'jsx-a11y/heading-has-content');
    });

    it('(jsx-a11y/html-has-lang) should report an error for html without lang', async () => {
      const code = `<html />\n`;
      const result = await lint(code);
      assertHasWarning(result, 'jsx-a11y/html-has-lang');
    });

    it('(jsx-a11y/iframe-has-title) should report an error for iframe without title', async () => {
      const code = `<iframe />\n`;
      const result = await lint(code);
      assertHasWarning(result, 'jsx-a11y/iframe-has-title');
    });

    it('(jsx-a11y/img-redundant-alt) should report an error for redundant alt text', async () => {
      const code = `<img alt='picture' />\n`;
      const result = await lint(code);
      assertHasWarning(result, 'jsx-a11y/img-redundant-alt');
    });

    it('(jsx-a11y/no-access-key) should report an error for access key', async () => {
      const code = `<div accessKey='a' />\n`;
      const result = await lint(code);
      assertHasWarning(result, 'jsx-a11y/no-access-key');
    });

    it('(jsx-a11y/no-distracting-elements) should report an error for distracting elements', async () => {
      const code = `<marquee />\n`;
      const result = await lint(code);
      assertHasWarning(result, 'jsx-a11y/no-distracting-elements');
    });

    it('(jsx-a11y/no-redundant-roles) should report an error for redundant roles', async () => {
      const code = `<button role='button' />\n`;
      const result = await lint(code);
      assertHasWarning(result, 'jsx-a11y/no-redundant-roles');
    });

    it('(jsx-a11y/role-has-required-aria-props) should report an error for role with missing required aria props', async () => {
      const code = `<div role='checkbox' />\n`;
      const result = await lint(code);
      assertHasWarning(result, 'jsx-a11y/role-has-required-aria-props');
    });

    it('(jsx-a11y/role-supports-aria-props) should report an error for role with unsupported aria props', async () => {
      const code = `<div role='button' aria-checked='true' />\n`;
      const result = await lint(code);
      assertHasWarning(result, 'jsx-a11y/role-supports-aria-props');
    });

    it('(jsx-a11y/scope) should report an error for scope on non-th elements', async () => {
      const code = `<div scope='col' />\n`;
      const result = await lint(code);
      assertHasWarning(result, 'jsx-a11y/scope');
    });
  });
});