const { RuleTester } = require('eslint')
const rule = require('eslint-plugin-react').rules['jsx-no-target-blank']

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    }
  }
})

ruleTester.run('react/jsx-no-target-blank', rule, {
  valid: [
    `<a href="https://example.com" target="_blank" rel="noreferrer noopener">link</a>`,
  ],
  invalid: [
    {
      code: `<a href="https://example.com" target="_blank">link</a>`,
      output: `<a href="https://example.com" target="_blank" rel="noreferrer">link</a>`,
      errors: [{ message: `Using target="_blank" without rel="noreferrer" (which implies rel="noopener") is a security risk in older browsers: see https://mathiasbynens.github.io/rel-noopener/#recommendations` }],
    },
  ],
})
