const { RuleTester } = require('eslint')
const rule = require('eslint-plugin-jsx-a11y').rules['aria-activedescendant-has-tabindex']

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2020, sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } } } })

ruleTester.run('jsx-a11y/aria-activedescendant-has-tabindex', rule, {
  valid: [
    `<div aria-activedescendant="foo" tabIndex={0} />`,
  ],
  invalid: [
    {
      code: `<div aria-activedescendant="foo" />`,
      errors: [{ message: 'An element that manages focus with `aria-activedescendant` must have a tabindex' }],
    },
  ],
})
