const test = require('node:test');
const RuleTester = require('eslint').RuleTester;
const rule = require('eslint-plugin-import/lib/rules/no-webpack-loader-syntax');

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  }
});

ruleTester.run('no-webpack-loader-syntax', rule, {
  valid: [
    { code: "import a from 'b';" }
  ],
  invalid: [
    {
      code: "import a from 'b!';",
      errors: [{ message: "Unexpected '!' in 'b!'. Do not use import syntax to configure webpack loaders." }]
    }
  ]
});
