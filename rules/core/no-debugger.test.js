const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('no-debugger')

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2020, sourceType: 'module' } })

ruleTester.run('no-debugger', rule, {
  valid: [
    `const a = 1;`,
  ],
  invalid: [
    {
      code: `debugger;`,
      errors: [{ message: "Unexpected 'debugger' statement." }],
    },
  ],
})
