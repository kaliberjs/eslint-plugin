const { RuleTester } = require('eslint')
const rule = require('eslint-plugin-react').rules['jsx-equals-spacing']

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    }
  }
})

ruleTester.run('react/jsx-equals-spacing', rule, {
  valid: [
    `<MyComponent prop="value" />`,
  ],
  invalid: [
    {
      code: `<MyComponent prop = "value" />`,
      output: `<MyComponent prop="value" />`,
      errors: [
        { message: "There should be no space before '='" },
        { message: "There should be no space after '='" },
      ],
    },
  ],
})
