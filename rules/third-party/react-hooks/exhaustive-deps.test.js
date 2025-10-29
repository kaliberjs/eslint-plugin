const { RuleTester } = require('eslint')
const rule = require('eslint-plugin-react-hooks').rules['exhaustive-deps']

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    }
  }
})

ruleTester.run('react-hooks/exhaustive-deps', rule, {
  valid: [
    `
      function MyComponent({ value }) {
        useEffect(() => {
          console.log(value);
        }, [value]);
        return <div />;
      }
    `,
  ],
  invalid: [
    {
      code: `
        function MyComponent({ value }) {
          useEffect(() => {
            console.log(value);
          }, []);
          return <div />;
        }
      `,
      errors: [{ message: "React Hook useEffect has a missing dependency: 'value'. Either include it or remove the dependency array." }],
    },
  ],
})
