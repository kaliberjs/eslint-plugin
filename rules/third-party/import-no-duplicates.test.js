const { RuleTester } = require('eslint')
const rule = require('eslint-plugin-import').rules['no-duplicates']

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
  }
})

ruleTester.run('import/no-duplicates', rule, {
  valid: [
    `import { a, b } from 'a';`,
    `import { a } from 'a'; import { b } from 'b';`,
  ],
  invalid: [
    {
      code: `import { a } from 'a'; import { b } from 'a';`,
      output: `import { a , b } from 'a'; `,
      errors: [
        { message: "'a' imported multiple times." },
        { message: "'a' imported multiple times." },
      ],
    },
  ],
})
