const { RuleTester } = require('eslint')
const rule = require('eslint-plugin-react').rules['jsx-indent']

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    }
  }
})

ruleTester.run('react/jsx-indent', rule, {
  valid: [
    `<MyComponent>\n    <AnotherComponent />\n</MyComponent>`
  ],
  invalid: [
    {
      code: `<MyComponent>\n  <AnotherComponent />\n</MyComponent>`,
      output: `<MyComponent>\n    <AnotherComponent />\n</MyComponent>`,
      errors: [{ message: "Expected indentation of 4 space characters but found 2." }],
    },
  ],
})
