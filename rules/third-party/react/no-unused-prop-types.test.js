const { RuleTester } = require('eslint');
const rule = require('eslint-plugin-react').rules['no-unused-prop-types'];

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
  settings: {
    react: { version: '18.0' }, // explicit version to avoid filesystem traversal
  },
});

ruleTester.run('react/no-unused-prop-types', rule, {
  valid: [
    {
      code: `
        const MyComponent = ({ name }) => <div>{name}</div>;
        MyComponent.propTypes = { name: require('prop-types').string };
      `,
    },
  ],
  invalid: [
    {
      code: `
        const MyComponent = () => <div />;
        MyComponent.propTypes = { name: require('prop-types').string };
      `,
      errors: [{ message: "'name' PropType is defined but prop is never used" }],
    },
  ],
});
