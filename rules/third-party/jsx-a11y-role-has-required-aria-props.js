const { RuleTester } = require('eslint')
const rule = require('eslint-plugin-jsx-a11y').rules['role-has-required-aria-props']

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    }
  }
})

ruleTester.run('jsx-a11y/role-has-required-aria-props', rule, {
  valid: [
    `<div role="checkbox" aria-checked="true" />`,
  ],
  invalid: [
    {
      code: `<div role="checkbox" />`,
      errors: [{ message: 'Elements with the ARIA role "checkbox" must have the following attributes defined: aria-checked' }],
    },
  ],
})
