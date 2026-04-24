const { RuleTester } = require('eslint')
const rule = require('eslint-plugin-react').rules['self-closing-comp']

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2020, sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } } } })

ruleTester.run('react/self-closing-comp', rule, {
  valid: [
    `<MyComponent />`,
  ],
  invalid: [
    {
      code: `<MyComponent></MyComponent>`,
      output: `<MyComponent />`,
      errors: [{ message: 'Empty components are self-closing' }],
    },
  ],
})
