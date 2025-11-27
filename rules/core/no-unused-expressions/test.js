const { RuleTester } = require('eslint')
const { Linter } = require('eslint')
const linter = new Linter()
const rule = linter.getRules().get('no-unused-expressions')

const ruleTester = new RuleTester()

ruleTester.run('no-unused-expressions', rule, {
  valid: [
    { code: 'var a = 1;' },
    { code: 'foo();' },
    { code: 'new Foo();' },
    { code: 'a && b();', options: [{ allowShortCircuit: true }] },
    { code: 'a ? b() : c();', options: [{ allowTernary: true }] },
  ],
  invalid: [
    {
      code: '0;',
      errors: [{ message: "Expected an assignment or function call and instead saw an expression." }],
    },
    {
      code: 'a && b;',
      errors: [{ message: "Expected an assignment or function call and instead saw an expression." }],
    },
  ],
})
