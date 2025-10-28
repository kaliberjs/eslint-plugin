const { RuleTester } = require('eslint')
const rule = require('eslint-plugin-jsx-a11y').rules['aria-props']

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    }
  }
})

ruleTester.run('jsx-a11y/aria-props', rule, {
  valid: [
    `<div aria-labelledby="foo" />`,
  ],
  invalid: [
    {
      code: `<div aria-foo="bar" />`,
      errors: [{ message: `aria-foo: This attribute is an invalid ARIA attribute.`, type: 'JSXAttribute' }],
    },
  ],
})
