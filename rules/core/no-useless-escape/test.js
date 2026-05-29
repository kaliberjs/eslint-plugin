const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('no-useless-escape')

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2020 } })

ruleTester.run('no-useless-escape', rule, {
  valid: [
    '"\\""',
    '/\\d/',
  ],
  invalid: [
    {
      code: '"\\a"',
      errors: [{ message: 'Unnecessary escape character: \\a.', suggestions: 2 }],
    },
    {
      code: '`\\a`',
      errors: [{ message: 'Unnecessary escape character: \\a.', suggestions: 2 }],
    },
    {
      code: '/\\a/',
      errors: [{ message: 'Unnecessary escape character: \\a.', suggestions: 2 }],
    },
  ],
})
