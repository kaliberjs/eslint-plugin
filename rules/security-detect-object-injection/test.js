const { test } = require('../../machinery/test')

test('security-detect-object-injection', {
  valid: [
    // Dot notation — not computed
    `obj.prop`,
    `obj.foo`,
    `this.value`,

    // Bracket notation with string literal
    `obj['prop']`,
    `obj["key"]`,

    // Bracket notation with numeric literal
    `arr[0]`,
    `arr[42]`,

    // Bracket notation with template literal (not an Identifier)
    'obj[`key`]',

    // Bracket notation with expression (not an Identifier)
    `obj[1 + 2]`,
    `obj[fn()]`,
    `obj[a.b]`,
    `obj[a + b]`,

    // Non-computed member expressions
    `a.b.c`,
    `foo.bar.baz`,
  ],

  invalid: [
    // Basic variable as bracket key
    {
      code: `obj[key]`,
      errors: [{ messageId: 'objectInjection' }],
    },
    {
      code: `data[prop]`,
      errors: [{ messageId: 'objectInjection' }],
    },
    {
      code: `config[name]`,
      errors: [{ messageId: 'objectInjection' }],
    },

    // In assignment (reading)
    {
      code: `const val = obj[key]`,
      errors: [{ messageId: 'objectInjection' }],
    },

    // In assignment (writing)
    {
      code: `obj[key] = 'value'`,
      errors: [{ messageId: 'objectInjection' }],
    },

    // In function argument
    {
      code: `fn(obj[key])`,
      errors: [{ messageId: 'objectInjection' }],
    },

    // In if condition
    {
      code: `if (obj[key]) {}`,
      errors: [{ messageId: 'objectInjection' }],
    },

    // In return statement
    {
      code: `function f() { return obj[key] }`,
      errors: [{ messageId: 'objectInjection' }],
    },

    // In template literal
    {
      code: 'const s = `${obj[key]}`',
      errors: [{ messageId: 'objectInjection' }],
    },

    // Nested computed access — inner triggers
    {
      code: `obj[a][b]`,
      errors: [
        { messageId: 'objectInjection' },
        { messageId: 'objectInjection' },
      ],
    },

    // In ternary
    {
      code: `const x = cond ? obj[key] : null`,
      errors: [{ messageId: 'objectInjection' }],
    },

    // Deeply nested — the inner obj[key] is NOT a direct child of ForInStatement
    {
      code: `for (const k in obj) {\n  const val = nested[key]\n}`,
      errors: [{ messageId: 'objectInjection' }],
    },

    // delete statement
    {
      code: `delete obj[key]`,
      errors: [{ messageId: 'objectInjection' }],
    },

    // Computed access on `this`
    {
      code: `this[prop]`,
      errors: [{ messageId: 'objectInjection' }],
    },

    // Computed access on array-like
    {
      code: `arguments[i]`,
      errors: [{ messageId: 'objectInjection' }],
    },

    // Optional chaining still triggers (computed + Identifier)
    {
      code: `obj?.[key]`,
      errors: [{ messageId: 'objectInjection' }],
    },
  ],
})
