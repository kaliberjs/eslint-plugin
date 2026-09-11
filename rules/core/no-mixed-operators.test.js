const { RuleTester } = require('eslint')
const stylistic = require('@stylistic/eslint-plugin')
const rule = stylistic.rules['no-mixed-operators']

const ruleTester = new RuleTester()

const mix = (left, right) =>
  `Unexpected mix of '${left}' and '${right}'. Use parentheses to clarify the intended order of operations.`

const sharedConfigOptions = [{
  groups: [
    ['&', '|', '^', '~', '<<', '>>', '>>>'],
    ['==', '!=', '===', '!==', '>', '>=', '<', '<='],
    ['&&', '||'],
    ['in', 'instanceof'],
  ],
  allowSamePrecedence: false,
}]

ruleTester.run('@stylistic/no-mixed-operators', rule, {
  valid: [
    'a + b - c',
    { code: '(a && b) || c', options: sharedConfigOptions },
    { code: 'a && b + c', options: sharedConfigOptions },
    { code: 'a + b * c', options: sharedConfigOptions },
  ],
  invalid: [
    {
      code: 'a + b * c',
      errors: [{ message: mix('+', '*') }, { message: mix('+', '*') }],
    },
    {
      code: 'a && b || c',
      options: sharedConfigOptions,
      errors: [{ message: mix('&&', '||') }, { message: mix('&&', '||') }],
    },
    {
      code: 'a | b & c',
      options: sharedConfigOptions,
      errors: [{ message: mix('|', '&') }, { message: mix('|', '&') }],
    },
    {
      code: 'a in b instanceof c',
      options: sharedConfigOptions,
      errors: [{ message: mix('in', 'instanceof') }, { message: mix('in', 'instanceof') }],
    },
    {
      code: 'a == b != c',
      options: sharedConfigOptions,
      errors: [{ message: mix('==', '!=') }, { message: mix('==', '!=') }],
    },
  ],
})
