const { RuleTester } = require('eslint')
const { Linter } = require('eslint')
const linter = new Linter()
const rule = linter.getRules().get('rest-spread-spacing')

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 6 } })

ruleTester.run('rest-spread-spacing', rule, {
  valid: [
    { code: 'let [...a] = [1, 2, 3];' },
    { code: 'let { ...a } = { x: 1, y: 2 };', parserOptions: { ecmaVersion: 2018 } },
  ],
  invalid: [
    {
      code: 'let [... a] = [1, 2, 3];',
      output: 'let [...a] = [1, 2, 3];',
      errors: [{ message: "Unexpected whitespace after rest operator." }],
    },
    {
      code: 'let { ... a } = { x: 1, y: 2 };',
      output: 'let { ...a } = { x: 1, y: 2 };',
      parserOptions: { ecmaVersion: 2018 },
      errors: [{ message: "Unexpected whitespace after rest property operator." }],
    },
  ],
})
