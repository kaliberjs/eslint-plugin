const { RuleTester } = require('eslint')
const rule = require('eslint-plugin-react').rules['jsx-no-duplicate-props']

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    }
  }
})

ruleTester.run('react/jsx-no-duplicate-props', rule, {
  valid: [
    `<MyComponent prop1="value1" prop2="value2" />`,
  ],
  invalid: [
    {
      code: `<MyComponent prop1="value1" prop1="value2" />`,
      errors: [{ message: "No duplicate props allowed" }],
    },
  ],
})
