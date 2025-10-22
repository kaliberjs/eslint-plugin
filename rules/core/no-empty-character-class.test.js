const { RuleTester } = require('eslint')
const rule = require('eslint/lib/rules/no-empty-character-class')

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
  }
})

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
