const { RuleTester } = require('eslint')
const rule = require('eslint-plugin-react').rules['require-render-return']

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    }
  }
})

ruleTester.run('react/require-render-return', rule, {
  valid: [
    `
      class Hello extends React.Component {
        render() {
          return <div>Hello</div>;
        }
      }
    `,
  ],
  invalid: [
    {
      code: `
        class Hello extends React.Component {
          render() {}
        }
      `,
      errors: [{ message: "Your render method should have a return statement" }],
    },
  ],
})
