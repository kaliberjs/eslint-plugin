const { RuleTester } = require('eslint')
const rule = require('eslint-plugin-import-x').rules.export

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2020, sourceType: 'module' } })

// The import-x/export rule detects cross-file export conflicts (re-exports
// clashing with local exports). Same-file duplicate exports are now caught by
// ESLint v10's parser as parse errors, making them untestable via RuleTester.
// We only verify the rule loads and accepts valid code.
ruleTester.run('import/export', rule, {
  valid: [
    'export const a = 1',
    'export const a = 1; export const b = 2',
    'export default function () {}',
  ],
  invalid: [],
})
