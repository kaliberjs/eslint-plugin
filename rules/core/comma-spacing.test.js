const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('comma-spacing')

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2020, sourceType: 'module' } })

ruleTester.run('comma-spacing', rule, {
  valid: [
    "const obj = { a: 1, b: 2 }",
    "const arr = [1, 2]",
  ],
  invalid: [
    {
      code: "const obj = { a: 1 ,b: 2 }",
      output: "const obj = { a: 1, b: 2 }",
      errors: [
        { message: "There should be no space before ','." },
        { message: "A space is required after ','." },
      ],
    },
    {
      code: "const arr = [1 ,2]",
      output: "const arr = [1, 2]",
      errors: [
        { message: "There should be no space before ','." },
        { message: "A space is required after ','." },
      ],
    },
  ],
})
