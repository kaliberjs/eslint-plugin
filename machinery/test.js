const { RuleTester } = require('eslint')
const { rules } = require('..')

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
})

module.exports = {
  test,
  handler,
  asyncHandler,
  merge,
}

function test(ruleName, tests) {
  const rule = rules[ruleName]
  ruleTester.run(ruleName, rule, tests)
}

function merge(...tests) {
  return tests.reduce(
    (result, { valid = [], invalid = [] }) => ({
      valid: result.valid.concat(valid),
      invalid: result.invalid.concat(invalid),
    }),
    { valid: [], invalid: [] }
  )
}

/**
 * Wraps a snippet in an Express-shaped request handler, so `req` resolves to
 * a registry source. Duplicated verbatim in 39 security test files before it
 * lived here.
 */
function handler(code) {
  return `function handler(req, res) { ${code} }`
}

function asyncHandler(code) {
  return `async function handler(req, res) { ${code} }`
}
