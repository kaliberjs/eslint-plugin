const { RuleTester } = require('eslint')
const stylistic = require('@stylistic/eslint-plugin')
const rule = stylistic.rules['jsx-curly-spacing']

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2020, sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } } } })

ruleTester.run('@stylistic/jsx-curly-spacing', rule, {
  valid: [
    "<MyComponent prop={value} />",
  ],
  invalid: [
    {
      code: "<MyComponent prop={ value } />",
      output: "<MyComponent prop={value} />",
      errors: [
        { message: "There should be no space after '{'" },
        { message: "There should be no space before '}'" },
      ],
    },
  ],
})
