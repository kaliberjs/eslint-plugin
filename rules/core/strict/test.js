const { RuleTester } = require('eslint')
const { Linter } = require('eslint')
const linter = new Linter()
const rule = linter.getRules().get('strict')

const ruleTester = new RuleTester()

ruleTester.run('strict', rule, {
  valid: [
    { code: 'function foo() { "use strict"; }' },
    { code: 'var foo = function() { "use strict"; };' },
  ],
  invalid: [
    {
      code: '"use strict"; function foo() {}',
      errors: [{ message: "Use the function form of 'use strict'." }],
    },
    {
      code: 'function foo() {}',
      errors: [{ message: "Missing 'use strict' statement." }],
      options: ['function'],
    },
    {
      code: 'var foo = function() {};',
      errors: [{ message: "Missing 'use strict' statement." }],
      options: ['function'],
    },
  ],
})
