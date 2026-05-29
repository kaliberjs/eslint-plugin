const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('arrow-spacing')

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2020 } })

ruleTester.run('arrow-spacing', rule, {
  valid: [
    { code: '() => {}' },
    { code: '(a) => {}' },
    { code: 'a => {}' },
  ],
  invalid: [
    {
      code: '()=>{}',
      output: '() => {}',
      errors: [
        { message: 'Missing space before =>.' },
        { message: 'Missing space after =>.' },
      ],
    },
    {
      code: '()=> {}',
      output: '() => {}',
      errors: [{ message: 'Missing space before =>.' }],
    },
    {
      code: '() =>{}',
      output: '() => {}',
      errors: [{ message: 'Missing space after =>.' }],
    },
  ],
})
