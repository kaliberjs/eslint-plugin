const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('no-path-concat')

// Deprecated in ESLint 9 but still functional. Keep testing until removed.
const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2020, sourceType: 'script', globals: { __dirname: 'readonly', __filename: 'readonly' } },
})

ruleTester.run('no-path-concat', rule, {
  valid: [
    'var fullPath = path.join(__dirname, "file.js");',
    'var fullPath = path.resolve(__dirname, "file.js");',
  ],
  invalid: [
    {
      code: 'var fullPath = __dirname + "/file.js";',
      errors: [{ message: 'Use path.join() or path.resolve() instead of + to create paths.' }],
    },
    {
      code: 'var fullPath = __filename + ".bak";',
      errors: [{ message: 'Use path.join() or path.resolve() instead of + to create paths.' }],
    },
  ],
})
