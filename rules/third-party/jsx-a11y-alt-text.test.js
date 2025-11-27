const { RuleTester } = require('eslint')
const rule = require('eslint-plugin-jsx-a11y').rules['alt-text']

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    }
  }
})

ruleTester.run('jsx-a11y/alt-text', rule, {
  valid: [
    `<img alt="foo" src="foo.jpg" />`,
  ],
  invalid: [
    {
      code: `<img src="foo.jpg" />`,
      errors: [{ message: 'img elements must have an alt prop, either with meaningful text, or an empty string for decorative images.', type: 'JSXOpeningElement' }],
    },
  ],
})
