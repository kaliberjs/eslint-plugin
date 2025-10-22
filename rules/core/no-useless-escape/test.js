const { RuleTester } = require('eslint')
const { Linter } = require('eslint')
const linter = new Linter()
const rule = linter.getRules().get('no-useless-escape')

const ruleTester = new RuleTester()

ruleTester.run('no-useless-escape', rule, {
  valid: [
    { code: '"\\""' },
    { code: "'\\''" },
    { code: '"\\x1f"' },
  ],
  invalid: [
    {
      code: '"\\a"',
      errors: [{ message: "Unnecessary escape character: \\a." }],
    },
    {
      code: "'\\b'",
      errors: [{ message: "Unnecessary escape character: \\b." }],
    },
  ],
})
