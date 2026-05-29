const { RuleTester } = require('eslint')
const rule = require('eslint-plugin-jsx-a11y').rules['scope']

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2020, sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } } } })

ruleTester.run('jsx-a11y/scope', rule, {
  valid: [
    `<th scope="col" />`,
  ],
  invalid: [
    {
      code: `<div scope="col" />`,
      errors: [{ message: `The scope prop can only be used on <th> elements.`, type: 'JSXAttribute' }],
    },
  ],
})
