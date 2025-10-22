const { RuleTester } = require('eslint')
const { Linter } = require('eslint')
const linter = new Linter()
const rule = linter.getRules().get('no-obj-calls')

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 6 } })

ruleTester.run('no-obj-calls', rule, {
  valid: [
    { code: 'var a = Math.random();' },
    { code: 'var a = JSON.parse("{}");' },
    { code: 'var a = Reflect.get({ x: 1, y: 2 }, "x");' },
  ],
  invalid: [
    {
      code: 'var a = Math();',
      errors: [{ message: "'Math' is not a function." }],
    },
    {
      code: 'var a = JSON();',
      errors: [{ message: "'JSON' is not a function." }],
    },
    {
      code: 'var a = Reflect();',
      parserOptions: { ecmaVersion: 6 },
      errors: [{ message: "'Reflect' is not a function." }],
    },
    {
      code: 'var a = new Math();',
      errors: [{ message: "'Math' is not a constructor." }],
    },
    {
      code: 'var a = new JSON();',
      errors: [{ message: "'JSON' is not a constructor." }],
    },
    {
      code: 'var a = new Reflect();',
      parserOptions: { ecmaVersion: 6 },
      errors: [{ message: "'Reflect' is not a constructor." }],
    },
  ],
})
