const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('no-octal-escape')

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } })

ruleTester.run('no-octal-escape', rule, {
  valid: [
    { code: 'var a = "hello world";' },
    { code: 'var a = "hello \\u00A9 world";' },
    { code: 'var a = "hello \\xA9 world";' },
    { code: 'var a = "hello \\0 world";' },
  ],
  invalid: [
    {
      code: 'var a = "hello \\123 world";',
      errors: [{ message: "Don't use octal: '\\123'. Use '\\u....' instead." }],
    },
  ],
})
