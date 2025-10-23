const { RuleTester } = require('eslint')
const rule = require('eslint-plugin-jsx-a11y').rules['accessible-emoji']

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    ecmaFeatures: {
      jsx: true,
    },
  },
})

ruleTester.run('accessible-emoji', rule, {
  valid: [
    { code: '<span role="img" aria-label="accessible emoji">👌</span>' },
    { code: '<span role="img" aria-labelledby="id">👌</span>' },
  ],
  invalid: [
    {
      code: '<span>👌</span>',
      errors: [{ message: 'Emojis should be wrapped in <span>, have role="img", and have an accessible description with aria-label or aria-labelledby.' }],
    },
    {
      code: '<span aria-label="accessible emoji">👌</span>',
      errors: [{ message: 'Emojis should be wrapped in <span>, have role="img", and have an accessible description with aria-label or aria-labelledby.' }],
    },
    {
      code: '<span role="img">👌</span>',
      errors: [{ message: 'Emojis should be wrapped in <span>, have role="img", and have an accessible description with aria-label or aria-labelledby.' }],
    },
  ],
})
