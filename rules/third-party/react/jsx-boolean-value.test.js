const { RuleTester } = require('eslint')
const rule = require('eslint-plugin-react').rules['jsx-boolean-value']

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    }
  }
})

ruleTester.run('react/jsx-boolean-value', rule, {
  valid: [
    `<MyComponent disabled />`,
  ],
  invalid: [
    {
      code: `<MyComponent disabled={true} />`,
      output: `<MyComponent disabled />`,
      errors: [{ message: "Value must be omitted for boolean attribute `disabled`" }],
    },
  ],
})
