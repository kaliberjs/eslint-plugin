const { RuleTester } = require('eslint')
const rule = require('eslint-plugin-import-x').rules.first

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2020, sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } } } })

ruleTester.run('import/first', rule, {
  valid: [
    `import { a } from 'a'; import { b } from 'b';`,
    `import { a } from 'a';\n\nconst b = 1;`,
  ],
  invalid: [
    {
      code: `const a = 1; import { b } from 'b';`,
      errors: [{ message: 'Import in body of module; reorder to top.', type: 'ImportDeclaration' }],
      output: `import { b } from 'b'; const a = 1;`,
    },
  ],
})
