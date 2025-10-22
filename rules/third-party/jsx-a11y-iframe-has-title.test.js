const { RuleTester } = require('eslint')
const rule = require('eslint-plugin-jsx-a11y').rules['iframe-has-title']

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    }
  }
})

ruleTester.run('jsx-a11y/iframe-has-title', rule, {
  valid: [
    `<iframe title="foo" />`,
  ],
  invalid: [
    {
      code: `<iframe />`,
      errors: [{ message: '<iframe> elements must have a unique title property.', type: 'JSXOpeningElement' }],
    },
  ],
})
