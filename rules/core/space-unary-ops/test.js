const { RuleTester } = require('eslint')
const { Linter } = require('eslint')
const linter = new Linter()
const rule = linter.getRules().get('space-unary-ops')

const ruleTester = new RuleTester()

ruleTester.run('space-unary-ops', rule, {
  valid: [
    { code: '++foo' },
    { code: 'foo++' },
    { code: '--foo' },
    { code: 'foo--' },
    { code: '+foo' },
    { code: '-foo' },
    { code: '!foo' },
    { code: '!!foo' },
    { code: 'typeof foo' },
    { code: 'void foo' },
    { code: 'delete foo.bar' },
    { code: 'delete foo["bar"]' },
  ],
  invalid: [
    {
      code: '++ foo',
      output: '++foo',
      errors: [{ message: "Unexpected space after unary operator '++'." }],
    },
    {
      code: 'foo ++',
      output: 'foo++',
      errors: [{ message: "Unexpected space before unary operator '++'." }],
    },
    {
      code: '-- foo',
      output: '--foo',
      errors: [{ message: "Unexpected space after unary operator '--'." }],
    },
    {
      code: 'foo --',
      output: 'foo--',
      errors: [{ message: "Unexpected space before unary operator '--'." }],
    },
    {
      code: '+ foo',
      output: '+foo',
      errors: [{ message: "Unexpected space after unary operator '+'." }],
    },
    {
      code: '- foo',
      output: '-foo',
      errors: [{ message: "Unexpected space after unary operator '-'." }],
    },
    {
      code: '! foo',
      output: '!foo',
      errors: [{ message: "Unexpected space after unary operator '!'." }],
    },
    {
      code: '!! foo',
      output: '!!foo',
      errors: [{ message: "Unexpected space after unary operator '!'." }],
    },
    {
      code: 'typeof!foo',
      output: 'typeof !foo',
      errors: [{ message: "Unary word operator 'typeof' must be followed by whitespace." }],
    },
    {
      code: 'void!foo',
      output: 'void !foo',
      errors: [{ message: "Unary word operator 'void' must be followed by whitespace." }],
    },
    {
      code: 'delete!foo.bar',
      output: 'delete !foo.bar',
      errors: [{ message: "Unary word operator 'delete' must be followed by whitespace." }],
    },
  ],
})
