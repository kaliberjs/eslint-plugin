const { RuleTester } = require('eslint')
const { Linter } = require('eslint')
const linter = new Linter()
const rule = linter.getRules().get('no-useless-computed-key')

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 6 } })

ruleTester.run('no-useless-computed-key', rule, {
  valid: [
    { code: 'var a = { [b]: 1 };' },
  ],
  invalid: [
    {
      code: 'var a = { ["a"]: 1 };',
      output: 'var a = { "a": 1 };',
      errors: [{ message: 'Unnecessarily computed property ["a"] found.' }],
    },
  ],
})
