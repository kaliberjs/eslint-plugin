const { RuleTester } = require('eslint')
const rule = require('eslint-plugin-jsx-a11y').rules['aria-proptypes']

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    }
  }
})

ruleTester.run('jsx-a11y/aria-proptypes', rule, {
  valid: [
    `<div aria-hidden="true" />`,
  ],
  invalid: [
    {
      code: `<div aria-hidden="baz" />`,
      errors: [{ message: `The value for aria-hidden must be a boolean.`, type: 'JSXAttribute' }],
    },
  ],
})
