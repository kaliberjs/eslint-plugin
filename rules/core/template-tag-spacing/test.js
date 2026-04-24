const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('template-tag-spacing')

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2020 } })

ruleTester.run('template-tag-spacing', rule, {
  valid: [
    { code: 'tag`template`' },
    { code: 'tag`template`', options: ['never'] },
    { code: 'tag `template`', options: ['always'] },
  ],
  invalid: [
    {
      code: 'tag `template`',
      output: 'tag`template`',
      errors: [{ message: "Unexpected space between template tag and template literal." }],
    },
    {
      code: 'tag`template`',
      output: 'tag `template`',
      options: ['always'],
      errors: [{ message: "Missing space between template tag and template literal." }],
    },
  ],
})
