const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('new-parens')

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2020, sourceType: 'module' } })

ruleTester.run('new-parens', rule, {
  valid: [
    'function Person() {}; new Person();',
  ],
  invalid: [
    {
      code: 'function Person() {}; new Person',
      output: 'function Person() {}; new Person()',
      errors: [{ message: "Missing '()' invoking a constructor." }],
    },
  ],
})
