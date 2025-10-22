const { RuleTester } = require('eslint')
const rule = require('eslint-plugin-react').rules['jsx-indent-props']

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    }
  }
})

ruleTester.run('react/jsx-indent-props', rule, {
  valid: [
    `
      <MyComponent
          prop="value"
      />
    `
  ],
  invalid: [
    {
      code: `
        <MyComponent
          prop="value"
        />
      `,
      output: `
        <MyComponent
            prop="value"
        />
      `,
      errors: [{ message: "Expected indentation of 12 space characters but found 10." }],
    },
  ],
})
