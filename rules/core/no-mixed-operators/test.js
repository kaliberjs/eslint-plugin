const { RuleTester } = require('eslint')
const { Linter } = require('eslint')
const linter = new Linter()
const rule = linter.getRules().get('no-mixed-operators')

const ruleTester = new RuleTester()

ruleTester.run('no-mixed-operators', rule, {
  valid: [
    { code: '(a && b) || c' },
    { code: 'a || (b && c)' },
    {
      code: 'a + b - c'
    },
    {
      code: 'a && b || c',
      options: [{
        groups: [
          ['&&', '||']
        ]
      }]
    }
  ],
  invalid: [
    {
      code: 'a && b || c',
      errors: [{ message: "Unexpected mix of '&&' and '||'. Use parentheses to clarify the intended order of operations." }],
    },
    {
      code: 'a || b && c',
      errors: [{ message: "Unexpected mix of '||' and '&&'. Use parentheses to clarify the intended order of operations." }],
    },
    {
      code: 'a && b + c',
      errors: [{ message: "Unexpected mix of '&&' and '+'. Use parentheses to clarify the intended order of operations." }],
    },
    {
      code: 'a + b && c',
      errors: [{ message: "Unexpected mix of '+' and '&&'. Use parentheses to clarify the intended order of operations." }],
    },
    {
      code: 'a && b | c',
      errors: [{ message: "Unexpected mix of '&&' and '|'. Use parentheses to clarify the intended order of operations." }],
    },
    {
      code: 'a | b && c',
      errors: [{ message: "Unexpected mix of '|' and '&&'. Use parentheses to clarify the intended order of operations." }],
    },
  ],
})
