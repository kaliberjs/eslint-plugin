const { RuleTester } = require('eslint')
const rule = require('eslint-plugin-react').rules['jsx-no-undef']

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    }
  }
})

ruleTester.run('react/jsx-no-undef', rule, {
  valid: [
    `var Hello = require('react').createClass({ render: function() { return <div>Hello {this.props.name}</div>; } });`,
    `var Hello = () => (<div>Hello</div>);`,
  ],
  invalid: [
    {
      code: `<Hello />`,
      errors: [{ message: "'Hello' is not defined." }],
    },
  ],
})
