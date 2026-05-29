const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('no-dupe-class-members')

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2020, sourceType: 'module' } })

ruleTester.run('no-dupe-class-members', rule, {
  valid: [
    'class A { a() {} b() {} }',
  ],
  invalid: [
    {
      code: 'class A { a() {} a() {} }',
      errors: [{ message: "Duplicate name 'a'." }],
    },
  ],
})
