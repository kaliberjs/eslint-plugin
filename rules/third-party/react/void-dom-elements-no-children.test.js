const { RuleTester } = require('eslint')
const rule = require('eslint-plugin-react').rules['void-dom-elements-no-children']

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    }
  }
})

ruleTester.run('react/void-dom-elements-no-children', rule, {
  valid: [
    `<br />`,
  ],
  invalid: [
    {
      code: `<br>Children</br>`,
      errors: [{ message: "Void DOM element <br /> cannot receive children." }],
    },
    {
      code: `<img dangerouslySetInnerHTML={{ __html: "Hello" }} />`,
      errors: [{ message: "Void DOM element <img /> cannot receive children." }],
    },
  ],
})
