const { RuleTester } = require('eslint')
const rule = require('eslint-plugin-react-hooks').rules['rules-of-hooks']

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    }
  }
})

ruleTester.run('react-hooks/rules-of-hooks', rule, {
  valid: [
    `
      function MyComponent() {
        const [value, setValue] = useState('value');
        useEffect(() => {
          console.log(value);
        });
        return <div />;
      }
    `,
  ],
  invalid: [
    {
      code: `
        function MyComponent({ value }) {
          if (value) {
            const [state, setState] = useState('value');
            return <div>{state}</div>;
          }
          return <div />;
        }
      `,
      errors: [{ message: "React Hook \"useState\" is called conditionally. React Hooks must be called in the exact same order in every component render. Did you accidentally call a React Hook after an early return?" }],
    },
    {
      code: `
        function MyComponent() {
          useEffect(() => {
            const [value, setValue] = useState('value');
          });
          return <div />;
        }
      `,
      errors: [{ message: "React Hook \"useState\" cannot be called inside a callback. React Hooks must be called in a React function component or a custom React Hook function." }],
    }
  ],
})
