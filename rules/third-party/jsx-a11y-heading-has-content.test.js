const { RuleTester } = require('eslint')
const rule = require('eslint-plugin-jsx-a11y').rules['heading-has-content']

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    }
  }
})

ruleTester.run('jsx-a11y/heading-has-content', rule, {
  valid: [
    `<h1>foo</h1>`,
  ],
  invalid: [
    {
      code: `<h1 />`,
      errors: [{ message: 'Headings must have content and the content must be accessible by a screen reader.', type: 'JSXOpeningElement' }],
    },
  ],
})
