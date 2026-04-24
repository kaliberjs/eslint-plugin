const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('rest-spread-spacing')

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2020 } })

ruleTester.run('rest-spread-spacing', rule, {
  valid: [
    { code: 'let [...a] = [1, 2, 3];' },
    { code: 'let { ...a } = { x: 1, y: 2 };', languageOptions: { ecmaVersion: 2020 } },
  ],
  invalid: [
    {
      code: 'let [... a] = [1, 2, 3];',
      output: 'let [...a] = [1, 2, 3];',
      errors: [{ message: 'Unexpected whitespace after rest operator.' }],
    },
    {
      code: 'let { ... a } = { x: 1, y: 2 };',
      output: 'let { ...a } = { x: 1, y: 2 };',
      languageOptions: { ecmaVersion: 2020 },
      errors: [{ message: 'Unexpected whitespace after rest property operator.' }],
    },
  ],
})
