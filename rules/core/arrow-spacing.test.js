const { RuleTester } = require('eslint')
const rule = require('eslint/use-at-your-own-risk').builtinRules.get('arrow-spacing')

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 6 } })

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
        { message: "Missing space before =>." },
        { message: "Missing space after =>." },
      ],
    },
    {
      code: '()=> {}',
      output: '() => {}',
      errors: [{ message: "Missing space before =>." }],
    },
    {
      code: '() =>{}',
      output: '() => {}',
      errors: [{ message: "Missing space after =>." }],
    },
  ],
})
