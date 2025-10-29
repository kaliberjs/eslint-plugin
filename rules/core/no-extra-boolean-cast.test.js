const { RuleTester } = require('eslint')
const rule = require('eslint/lib/rules/no-extra-boolean-cast')

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
  }
})

ruleTester.run('no-extra-boolean-cast', rule, {
  valid: [
    `if (foo) {}`,
  ],
  invalid: [
    {
      code: `if (!!foo) {}`,
      output: `if (foo) {}`,
      errors: [{ message: "Redundant double negation." }],
    },
    {
      code: `if (Boolean(foo)) {}`,
      output: `if (foo) {}`,
      errors: [{ message: "Redundant Boolean call." }],
    },
  ],
})
