const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('no-delete-var')

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2020,
    sourceType: 'script',
  }
})

ruleTester.run('no-delete-var', rule, {
  valid: [
    `const obj = { a: 1 }; delete obj.a;`,
  ],
  invalid: [
    {
      code: `let a; delete a;`,
      errors: [{ message: 'Variables should not be deleted.' }],
    },
  ],
})
