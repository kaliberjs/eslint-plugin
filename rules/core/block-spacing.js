const { RuleTester } = require('eslint')
const rule = require('eslint/lib/rules/block-spacing')

const ruleTester = new RuleTester()

ruleTester.run('block-spacing', rule, {
  valid: [
    { code: 'if (foo) { bar() }' },
    { code: 'if (foo) { bar(); }' },
    { code: 'function foo() { return; }' },
  ],
  invalid: [
    {
      code: 'if (foo) {bar()}',
      output: 'if (foo) { bar() }',
      errors: [
        { message: "Requires a space after '{'." },
        { message: "Requires a space before '}'." },
      ],
    },
    {
      code: 'if (foo) {bar();}',
      output: 'if (foo) { bar(); }',
      errors: [
        { message: "Requires a space after '{'." },
        { message: "Requires a space before '}'." },
      ],
    },
    {
      code: 'function foo() {return;}',
      output: 'function foo() { return; }',
      errors: [
        { message: "Requires a space after '{'." },
        { message: "Requires a space before '}'." },
      ],
    },
  ],
})
