const { RuleTester } = require('eslint')
const rule = require('eslint-plugin-jsx-a11y').rules['aria-role']

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    }
  }
})

ruleTester.run('jsx-a11y/aria-role', rule, {
  valid: [
    `<div role="button" />`,
  ],
  invalid: [
    {
      code: `<div role="foo" />`,
      errors: [{ message: `Elements with ARIA roles must use a valid, non-abstract ARIA role.`, type: 'JSXAttribute' }],
    },
  ],
})
