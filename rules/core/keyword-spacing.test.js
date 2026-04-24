const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('keyword-spacing')

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2020, sourceType: 'module' } })

ruleTester.run('keyword-spacing', rule, {
  valid: [
    `if (foo) {} else {}`,
  ],
  invalid: [
    {
      code: `if(foo) {} else {}`,
      output: `if (foo) {} else {}`,
      errors: [{ message: "Expected space(s) after \"if\"." }],
    },
    {
      code: `if (foo) {}else {}`,
      output: `if (foo) {} else {}`,
      errors: [{ message: "Expected space(s) before \"else\"." }],
    },
  ],
})
