const { RuleTester } = require('eslint')
const rule = require('eslint-plugin-jsx-a11y').rules['no-access-key']

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    }
  }
})

ruleTester.run('jsx-a11y/no-access-key', rule, {
  valid: [
    `<div />`,
  ],
  invalid: [
    {
      code: `<div accessKey="a" />`,
      errors: [{ message: 'No access key attribute allowed. Inconsistencies between keyboard shortcuts and keyboard commands used by screen readers and keyboard-only users create a11y complications.', type: 'JSXOpeningElement' }],
    },
  ],
})
