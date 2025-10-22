const { RuleTester } = require('eslint')
const { Linter } = require('eslint')
const linter = new Linter()
const rule = linter.getRules().get('no-useless-constructor')

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 6 } })

ruleTester.run('no-useless-constructor', rule, {
  valid: [
    { code: 'class A { constructor() { this.a = 1; } }' },
    { code: 'class A extends B { constructor() { super(); this.a = 1; } }' },
  ],
  invalid: [
    {
      code: 'class A { constructor() {} }',
      errors: [{ message: "Useless constructor." }],
    },
    {
      code: 'class A extends B { constructor() { super(); } }',
      errors: [{ message: "Useless constructor." }],
    },
  ],
})
