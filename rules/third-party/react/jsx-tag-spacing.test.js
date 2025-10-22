const { RuleTester } = require('eslint')
const rule = require('eslint-plugin-react').rules['jsx-tag-spacing']

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    }
  }
})

ruleTester.run('react/jsx-tag-spacing', rule, {
  valid: [
    `<MyComponent />`,
    `<MyComponent></MyComponent>`,
  ],
  invalid: [
    {
      code: `< MyComponent />`,
      output: `<MyComponent />`,
      errors: [{ message: "A space is forbidden after opening bracket" }],
    },
    {
      code: `<MyComponent / >`,
      output: `<MyComponent />`,
      errors: [{ message: "Whitespace is forbidden between `/` and `>`; write `/>`" }],
    },
    {
      code: `<MyComponent>< /MyComponent>`,
      output: `<MyComponent></MyComponent>`,
      errors: [{ message: "Whitespace is forbidden between `<` and `/`; write `</`" }],
    },
  ],
})
