const { test } = require('../../machinery/test')

test('security-detect-unsafe-regex', {
  valid: [
    // Simple quantifiers (not nested)
    `/a+/`,
    `/a*/`,
    `/a?/`,
    `/a{2,4}/`,

    // Group without quantifier inside, quantifier outside
    `/(abc)+/`,
    `/(abc)*/`,

    // Quantifier inside group, no quantifier outside
    `/(a+)/`,
    `/(a*)/`,
    `/(a+b*)/`,

    // Character classes with quantifiers (not groups)
    `/[a-z]+/`,
    `/[0-9]*/`,
    `/[a-z]+[0-9]*/`,

    // Non-regex literal (number)
    `const x = 42`,

    // Non-regex literal (string)
    `const x = "hello"`,

    // Non-regex literal (boolean)
    `const x = true`,

    // new RegExp with safe pattern
    `new RegExp('abc+')`,
    `new RegExp('(abc)+')`,

    // new RegExp with non-string argument (variable)
    `new RegExp(pattern)`,

    // new RegExp with no arguments
    `new RegExp()`,

    // Not a RegExp constructor
    `new Something('(a+)+')`,

    // new RegExp with number argument
    `new RegExp(123)`,

    // Alternation without nested quantifiers
    `/(a|b)+/`,

    // Complex safe pattern
    `/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/`,
  ],
  invalid: [
    // Classic nested quantifier: (a+)+
    {
      code: `/(a+)+/`,
      errors: [{ messageId: 'unsafeRegex' }],
    },
    // (a*)*
    {
      code: `/(a*)*/ `,
      errors: [{ messageId: 'unsafeRegex' }],
    },
    // (a+)*
    {
      code: `/(a+)*/`,
      errors: [{ messageId: 'unsafeRegex' }],
    },
    // (a*)+
    {
      code: `/(a*)+/`,
      errors: [{ messageId: 'unsafeRegex' }],
    },
    // (a+)?
    {
      code: `/(a+)?/`,
      errors: [{ messageId: 'unsafeRegex' }],
    },
    // Nested quantifier with {n} repetition outside
    {
      code: `/(a+){2}/`,
      errors: [{ messageId: 'unsafeRegex' }],
    },
    // Nested quantifier with {n,m} repetition outside
    {
      code: `/(a+){2,4}/`,
      errors: [{ messageId: 'unsafeRegex' }],
    },
    // More complex group content with nested quantifier
    {
      code: `/(ab+cd*)+/`,
      errors: [{ messageId: 'unsafeRegex' }],
    },
    // Multiple chars in group with nested quantifier
    {
      code: `/(foo*)+/`,
      errors: [{ messageId: 'unsafeRegex' }],
    },
    // new RegExp with nested quantifier (a+)+
    {
      code: `new RegExp('(a+)+')`,
      errors: [{ messageId: 'unsafeRegex' }],
    },
    // new RegExp with (a*)*
    {
      code: `new RegExp('(a*)*')`,
      errors: [{ messageId: 'unsafeRegex' }],
    },
    // new RegExp with (x+){2}
    {
      code: `new RegExp('(x+){2}')`,
      errors: [{ messageId: 'unsafeRegex' }],
    },
    // Regex literal with pattern in larger expression
    {
      code: `const re = /(a+)+/`,
      errors: [{ messageId: 'unsafeRegex' }],
    },
    // Nested quantifier with * inside and + outside
    {
      code: `/(.*)+/`,
      errors: [{ messageId: 'unsafeRegex' }],
    },
  ],
})
