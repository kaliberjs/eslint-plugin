const { RuleTester } = require('eslint')
const { rules } = require('..')
const babelParser = require('@babel/eslint-parser')

const ruleTester = new RuleTester({
  languageOptions: {
    parser: babelParser,
    parserOptions: {
      sourceType: 'module',
      ecmaFeatures: {
        jsx: true,
      },
      requireConfigFile: false,
      babelOptions: {
        presets: ["@babel/preset-react"],
      },
    }
  }
})

module.exports = {
  test,
  merge,
}

function test(ruleName, tests) {
  const rule = rules[ruleName]
  ruleTester.run(ruleName, rule, tests)
}

function merge(...tests) {
  return tests.reduce(
    (result, { valid, invalid }) => ({
      valid: result.valid.concat(valid),
      invalid: result.invalid.concat(invalid),
    }),
    { valid: [], invalid: [] }
  )
}
