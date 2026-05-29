const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('no-empty-pattern')

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2020, sourceType: 'module' } })

ruleTester.run('no-empty-pattern', rule, {
  valid: [
    `const { a } = {}`,
  ],
  invalid: [
    {
      code: `const {} = {}`,
      errors: [{ message: 'Unexpected empty object pattern.' }],
    },
    {
      code: `const [] = []`,
      errors: [{ message: 'Unexpected empty array pattern.' }],
    },
  ],
})
