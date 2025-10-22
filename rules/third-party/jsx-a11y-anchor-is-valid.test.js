const { RuleTester } = require('eslint')
const rule = require('eslint-plugin-jsx-a11y').rules['anchor-is-valid']

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    }
  }
})

ruleTester.run('jsx-a11y/anchor-is-valid', rule, {
  valid: [
    `<a href="foo">foo</a>`,
  ],
  invalid: [
    {
      code: `<a>foo</a>`,
      errors: [{ message: 'The href attribute is required for an anchor to be keyboard accessible. Provide a valid, navigable address as the href value. If you cannot provide an href, but still need the element to resemble a link, use a button and change it with appropriate styles. Learn more: https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/HEAD/docs/rules/anchor-is-valid.md', type: 'JSXOpeningElement' }],
    },
  ],
})
