const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('eol-last')

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2020, sourceType: 'module' } })

ruleTester.run('eol-last', rule, {
  valid: [
    "const a = 1;\n",
  ],
  invalid: [
    {
      code: "const a = 1;",
      output: "const a = 1;\n",
      errors: [{ message: 'Newline required at end of file but not found.' }],
    },
  ],
})
