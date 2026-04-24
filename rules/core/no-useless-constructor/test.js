const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('no-useless-constructor')

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2020 } })

ruleTester.run('no-useless-constructor', rule, {
  valid: [
    { code: 'class A { constructor() { this.a = 1; } }' },
    { code: 'class A extends B { constructor() { super(); this.a = 1; } }' },
  ],
  invalid: [
    {
      code: 'class A { constructor() {} }',
      errors: [{ message: 'Useless constructor.', suggestions: 1 }],
    },
    {
      code: 'class A extends B { constructor() { super(); } }',
      errors: [{ message: 'Useless constructor.', suggestions: 1 }],
    },
  ],
})
