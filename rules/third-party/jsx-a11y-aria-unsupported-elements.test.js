const { RuleTester } = require('eslint')
const rule = require('eslint-plugin-jsx-a11y').rules['aria-unsupported-elements']

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    }
  }
})

ruleTester.run('jsx-a11y/aria-unsupported-elements', rule, {
  valid: [
    `<div />`,
  ],
  invalid: [
    {
      code: `<meta charset="UTF-8" aria-hidden="true" />`,
      errors: [{ message: `This element does not support ARIA roles, states and properties. Try removing the prop 'aria-hidden'.`, type: 'JSXOpeningElement' }],
    },
  ],
})
