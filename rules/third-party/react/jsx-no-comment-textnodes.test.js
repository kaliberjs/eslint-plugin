const { RuleTester } = require('eslint')
const rule = require('eslint-plugin-react').rules['jsx-no-comment-textnodes']

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    }
  }
})

ruleTester.run('react/jsx-no-comment-textnodes', rule, {
  valid: [
    `<div>{/* a comment */}</div>`,
  ],
  invalid: [
    {
      code: `<div>// a comment</div>`,
      errors: [{ message: "Comments inside children section of tag should be placed inside braces" }],
    },
    {
      code: `<div>/* a comment */</div>`,
      errors: [{ message: "Comments inside children section of tag should be placed inside braces" }],
    },
  ],
})
