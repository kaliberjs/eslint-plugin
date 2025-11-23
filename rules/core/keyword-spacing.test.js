const { RuleTester } = require('eslint')
const rule = require('eslint/use-at-your-own-risk').builtinRules.get('keyword-spacing')

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
  }
})

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
