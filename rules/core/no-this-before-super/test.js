const { RuleTester } = require('eslint')
const { Linter } = require('eslint')
const linter = new Linter()
const rule = linter.getRules().get('no-this-before-super')

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 6 } })

ruleTester.run('no-this-before-super', rule, {
  valid: [
    { code: 'class A extends B { constructor() { super(); this.a = 1; } }' },
    { code: 'class A { constructor() { this.a = 1; } }' },
  ],
  invalid: [
    {
      code: 'class A extends B { constructor() { this.a = 1; super(); } }',
      errors: [{ message: "'this' is not allowed before 'super()'." }],
    },
    {
      code: 'class A extends B { constructor() { super.foo(); super(); } }',
      errors: [{ message: "'super' is not allowed before 'super()'." }],
    },
  ],
})
