const { RuleTester } = require('eslint')
const { Linter } = require('eslint')
const linter = new Linter()
const rule = linter.getRules().get('no-restricted-syntax')

const ruleTester = new RuleTester()

ruleTester.run('no-restricted-syntax', rule, {
  valid: [
    { code: 'foo()', options: ['bar'] },
    { code: 'var foo = 1;', options: ['bar'] },
  ],
  invalid: [
    {
      code: 'bar()',
      options: ['CallExpression[callee.name="bar"]'],
      errors: [{ message: "Using 'CallExpression[callee.name=\"bar\"]' is not allowed." }],
    },
    {
      code: 'var bar = 1;',
      options: ['VariableDeclarator[id.name="bar"]'],
      errors: [{ message: "Using 'VariableDeclarator[id.name=\"bar\"]' is not allowed." }],
    },
  ],
})
