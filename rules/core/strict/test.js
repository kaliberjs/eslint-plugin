const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('strict')

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } })

ruleTester.run('strict', rule, {
  valid: [
    {
      code: 'function foo() { "use strict"; }',
      options: ['function'],
    },
  ],
  invalid: [
    {
      code: 'function foo() {}',
      options: ['function'],
      errors: [{ message: "Use the function form of 'use strict'." }],
    },
    {
      code: '"use strict"; function foo() {}',
      options: ['function'],
      errors: [
        { message: "Use the function form of 'use strict'." },
        { message: "Use the function form of 'use strict'." },
    ],
    }
  ],
})
