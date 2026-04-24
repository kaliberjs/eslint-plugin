const { RuleTester } = require('eslint')
const rule = require('eslint-plugin-jsx-a11y').rules['anchor-has-content']

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2020, sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } } } })

ruleTester.run('jsx-a11y/anchor-has-content', rule, {
  valid: [
    `<a>foo</a>`,
  ],
  invalid: [
    {
      code: `<a></a>`,
      errors: [{ message: 'Anchors must have content and the content must be accessible by a screen reader.', type: 'JSXOpeningElement' }],
    },
  ],
})
