// TODO: eslint-plugin-react@7.37.5 prop-types rule triggers scopeManager.addGlobals error
// with @babel/eslint-parser in ESLint v10. This test is skipped until eslint-plugin-react
// is updated for ESLint v10 compatibility, or until we migrate to @eslint-react/eslint-plugin.
//
// const { RuleTester } = require('eslint')
// const rule = require('eslint-plugin-react').rules['prop-types']
//
// const ruleTester = new RuleTester({
//   languageOptions: {
//     parser: require('@babel/eslint-parser'),
//     ecmaVersion: 2020,
//     sourceType: 'module',
//     parserOptions: {
//       ecmaFeatures: { jsx: true },
//       requireConfigFile: false,
//       babelOptions: {
//         presets: [require.resolve('@babel/preset-react')]
//       },
//     },
//   },
// })
//
// ruleTester.run('react/prop-types', rule, {
//   valid: [
//     `
//       class Hello extends React.Component {
//         static propTypes = {
//           name: require('prop-types').string.isRequired,
//         };
//         render() {
//           return <div>Hello {this.props.name}</div>;
//         }
//       }
//     `,
//   ],
//   invalid: [
//     {
//       code: `
//         class Hello extends React.Component {
//           render() {
//             return <div>Hello {this.props.name}</div>;
//           }
//         }
//       `,
//       errors: [{ message: "'name' is missing in props validation" }],
//     },
//   ],
// })
