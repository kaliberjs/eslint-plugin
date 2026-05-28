const { RuleTester } = require('eslint')
const rule = require('eslint-plugin-react').rules['jsx-pascal-case']

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2020, sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } } },
  settings: { react: { version: '18.0' } },
})

ruleTester.run('react/jsx-pascal-case', rule, {
  valid: [
    { code: `<MyComponent />` },
    { code: `<MY_CONSTANT />`, options: [{ allowAllCaps: true }] },
    { code: `<div />` },
  ],
  invalid: [
    {
      code: `<My_Component />`,
      errors: [{ message: 'Imported JSX component My_Component must be in PascalCase or SCREAMING_SNAKE_CASE' }],
      options: [{ allowAllCaps: true }],
    },
  ],
})
