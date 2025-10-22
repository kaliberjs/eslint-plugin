const { RuleTester } = require('eslint')
const rule = require('eslint-plugin-react').rules['no-danger-with-children']

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    }
  }
})

ruleTester.run('react/no-danger-with-children', rule, {
  valid: [
    `<div dangerouslySetInnerHTML={{ __html: "Hello" }} />`,
    `<div>Hello</div>`,
  ],
  invalid: [
    {
      code: `<div dangerouslySetInnerHTML={{ __html: "Hello" }}>World</div>`,
      errors: [{ message: "Only set one of `children` or `props.dangerouslySetInnerHTML`" }],
    },
  ],
})
