const { RuleTester } = require('eslint')
const rule = require('eslint-plugin-jsx-a11y').rules['no-redundant-roles']

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    }
  }
})

ruleTester.run('jsx-a11y/no-redundant-roles', rule, {
  valid: [
    `<div role="button" />`,
  ],
  invalid: [
    {
      code: `<button role="button" />`,
      errors: [{ message: `The element button has an implicit role of button. Defining this explicitly is redundant and should be avoided.`, type: 'JSXOpeningElement' }],
    },
  ],
})
