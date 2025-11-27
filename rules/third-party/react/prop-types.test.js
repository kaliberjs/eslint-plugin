const { RuleTester } = require('eslint')
const rule = require('eslint-plugin-react').rules['prop-types']

const ruleTester = new RuleTester({
  parser: require.resolve('@babel/eslint-parser'),
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
    requireConfigFile: false,
    babelOptions: {
      presets: [require.resolve('@babel/preset-react')]
    }
  }
})

ruleTester.run('react/prop-types', rule, {
  valid: [
    `
      class Hello extends React.Component {
        static propTypes = {
          name: require('prop-types').string.isRequired,
        };
        render() {
          return <div>Hello {this.props.name}</div>;
        }
      }
    `,
  ],
  invalid: [
    {
      code: `
        class Hello extends React.Component {
          render() {
            return <div>Hello {this.props.name}</div>;
          }
        }
      `,
      errors: [{ message: "'name' is missing in props validation" }],
    },
  ],
})
