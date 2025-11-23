const { RuleTester } = require('eslint');
const rule = require('eslint-plugin-react').rules['jsx-uses-vars'];
const noUnusedVarsRule = require('eslint/use-at-your-own-risk').builtinRules.get('no-unused-vars');

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
});

ruleTester.run('react/jsx-uses-vars', rule, {
  valid: [
    {
      code: '/*eslint no-unused-vars: "error"*/\nconst MyComponent = () => {};\n<MyComponent />;',
    },
  ],
  invalid: [],
});
