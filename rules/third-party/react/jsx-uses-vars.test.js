const { RuleTester } = require('eslint')
const rule = require('eslint-plugin-react').rules['jsx-uses-vars']
const { builtinRules: builtinRules2 } = require('eslint/use-at-your-own-risk')
const noUnusedVarsRule = builtinRules2.get('no-unused-vars')

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
})

ruleTester.run('react/jsx-uses-vars', rule, {
  valid: [
    {
      code: '/*eslint no-unused-vars: "error"*/\nconst MyComponent = () => {};\n<MyComponent />;',
    },
  ],
  invalid: [],
})
