const { RuleTester } = require('eslint')
const rule = require('eslint-plugin-react').rules['no-deprecated']

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    }
  },
  settings: {
    react: {
      version: "17.0",
    },
  },
})

ruleTester.run('react/no-deprecated', rule, {
  valid: [
    `var ReactDOM = require('react-dom'); ReactDOM.render(<div />, document.body);`,
  ],
  invalid: [
    {
      code: `var React = require('react'); React.render(<div />, document.body);`,
      errors: [{ message: "React.render is deprecated since React 0.14.0, use ReactDOM.render instead" }],
    },
  ],
})
