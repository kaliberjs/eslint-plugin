const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('no-empty-character-class')

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2020, sourceType: 'module' } })

ruleTester.run('no-empty-character-class', rule, {
  valid: [
    `const regex = /[a]/`,
  ],
  invalid: [
    {
      code: `const regex = /[]/`,
      errors: [{ message: "Empty class." }],
    },
  ],
})
