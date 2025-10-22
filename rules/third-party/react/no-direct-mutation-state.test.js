const { RuleTester } = require('eslint')
const rule = require('eslint-plugin-react').rules['no-direct-mutation-state']

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    }
  }
})

ruleTester.run('react/no-direct-mutation-state', rule, {
  valid: [
    `
      class Hello extends React.Component {
        constructor(props) {
          super(props);
          this.state = {message: 'Hello'};
        }
        updateMessage() {
          this.setState({message: 'Hi'});
        }
        render() {
          return <div>{this.state.message}</div>;
        }
      }
    `,
  ],
  invalid: [
    {
      code: `
        class Hello extends React.Component {
          constructor(props) {
            super(props);
            this.state = {message: 'Hello'};
          }
          updateMessage() {
            this.state.message = 'Hi';
          }
          render() {
            return <div>{this.state.message}</div>;
          }
        }
      `,
      errors: [{ message: "Do not mutate state directly. Use setState()." }],
    },
  ],
})
