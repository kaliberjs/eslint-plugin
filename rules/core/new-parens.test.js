const { RuleTester } = require('eslint')
const rule = require('eslint/lib/rules/new-parens')

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
  }
})

ruleTester.run('new-parens', rule, {
  valid: [
    `function Person() {}; new Person();`,
  ],
  invalid: [
    {
      code: `function Person() {}; new Person`,
      output: `function Person() {}; new Person()`,
      errors: [{ message: "Missing '()' invoking a constructor." }],
    },
  ],
})
