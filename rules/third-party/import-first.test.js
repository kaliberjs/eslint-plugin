const { RuleTester } = require('eslint')
const rule = require('eslint-plugin-import').rules.first

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
      generators: true,
      experimentalObjectRestSpread: true,
    }
  }
})

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
