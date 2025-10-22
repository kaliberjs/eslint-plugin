const { RuleTester } = require('eslint')
const rule = require('eslint-plugin-react').rules['jsx-wrap-multilines']

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    }
  }
})

ruleTester.run('react/jsx-wrap-multilines', rule, {
  valid: [
    `
      const Hello = (
        <div>
          <p>Hello</p>
        </div>
      );
    `,
  ],
  invalid: [
    {
      code: `
        const Hello =
          <div>
            <p>Hello</p>
          </div>;
      `,
      output: `
        const Hello =
          (<div>
            <p>Hello</p>
          </div>);
      `,
      errors: [{ message: "Missing parentheses around multilines JSX" }],
    },
  ],
})
