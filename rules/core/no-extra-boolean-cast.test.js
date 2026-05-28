const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('no-extra-boolean-cast')

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2020, sourceType: 'module' } })

ruleTester.run('no-extra-boolean-cast', rule, {
  valid: [
    "if (foo) {}",
  ],
  invalid: [
    {
      code: "if (!!foo) {}",
      output: "if (foo) {}",
      errors: [{ message: 'Redundant double negation.' }],
    },
    {
      code: "if (Boolean(foo)) {}",
      output: "if (foo) {}",
      errors: [{ message: 'Redundant Boolean call.' }],
    },
  ],
})
