const { RuleTester } = require('eslint')
const stylistic = require('@stylistic/eslint-plugin')
const rule = stylistic.rules['jsx-tag-spacing']

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2020, sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } } } })

ruleTester.run('@stylistic/jsx-tag-spacing', rule, {
  valid: [
    '<MyComponent />',
    '<MyComponent></MyComponent>',
  ],
  invalid: [
    {
      code: '< MyComponent />',
      output: '<MyComponent />',
      errors: [{ message: 'A space is forbidden after opening bracket' }],
    },
    {
      code: '<MyComponent / >',
      output: '<MyComponent />',
      errors: [{ message: 'Whitespace is forbidden between `/` and `>`; write `/>`' }],
    },
    {
      code: '<MyComponent>< /MyComponent>',
      output: '<MyComponent></MyComponent>',
      errors: [{ message: 'Whitespace is forbidden between `<` and `/`; write `</`' }],
    },
  ],
})
