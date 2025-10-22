const { RuleTester } = require('eslint')
const rule = require('eslint-plugin-jsx-a11y').rules['role-supports-aria-props']

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    }
  }
})

ruleTester.run('jsx-a11y/role-supports-aria-props', rule, {
  valid: [
    `<div role="button" aria-pressed="true" />`,
  ],
  invalid: [
    {
      code: `<div role="button" aria-checked="true" />`,
      errors: [{ message: "The attribute aria-checked is not supported by the role button." }],
    },
  ],
})
