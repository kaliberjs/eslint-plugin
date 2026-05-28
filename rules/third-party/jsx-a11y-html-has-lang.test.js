const { RuleTester } = require('eslint')
const rule = require('eslint-plugin-jsx-a11y').rules['html-has-lang']

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2020, sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } } } })

ruleTester.run('jsx-a11y/html-has-lang', rule, {
  valid: [
    `<html lang="en" />`,
  ],
  invalid: [
    {
      code: '<html />',
      errors: [{ message: '<html> elements must have the lang prop.' }],
    },
  ],
})
