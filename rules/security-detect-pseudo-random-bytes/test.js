const { test } = require('../../machinery/test')

test('security-detect-pseudo-random-bytes', {
  valid: [
    // --- Safe alternative: crypto.randomBytes ---
    `crypto.randomBytes(16)`,

    // --- Different method names ---
    `crypto.randomFillSync(buffer)`,
    `crypto.randomFill(buffer, callback)`,
    `crypto.randomUUID()`,
    `crypto.createHash('sha256')`,

    // --- Not a call expression (just member access) ---
    `const fn = crypto.pseudoRandomBytes`,

    // --- Computed property (property.type is not Identifier) ---
    `crypto['pseudoRandomBytes'](16)`,
    `crypto[\`pseudoRandomBytes\`](16)`,

    // --- Callee is not a MemberExpression (bare function call) ---
    `pseudoRandomBytes(16)`,

    // --- Property name is similar but not exact ---
    `crypto.pseudorandombytes(16)`,
    `crypto.PseudoRandomBytes(16)`,
    `crypto.pseudo_random_bytes(16)`,
    `crypto.pseudoRandom(16)`,
    `crypto.randomPseudoBytes(16)`,

    // --- Not a CallExpression (new expression) ---
    `new crypto.pseudoRandomBytes(16)`,

    // --- Other objects with randomBytes ---
    `myLib.randomBytes(16)`,
    `util.generateBytes(16)`,
  ],
  invalid: [
    // --- Basic case: crypto.pseudoRandomBytes ---
    {
      code: `crypto.pseudoRandomBytes(16)`,
      errors: [{ messageId: 'pseudoRandomBytes' }],
    },

    // --- No arguments ---
    {
      code: `crypto.pseudoRandomBytes()`,
      errors: [{ messageId: 'pseudoRandomBytes' }],
    },

    // --- Multiple arguments ---
    {
      code: `crypto.pseudoRandomBytes(16, callback)`,
      errors: [{ messageId: 'pseudoRandomBytes' }],
    },

    // --- Different object names (rule doesn't check the object) ---
    {
      code: `myModule.pseudoRandomBytes(32)`,
      errors: [{ messageId: 'pseudoRandomBytes' }],
    },
    {
      code: `require('crypto').pseudoRandomBytes(16)`,
      errors: [{ messageId: 'pseudoRandomBytes' }],
    },
    {
      code: `this.pseudoRandomBytes(16)`,
      errors: [{ messageId: 'pseudoRandomBytes' }],
    },

    // --- Deeply nested object ---
    {
      code: `lib.crypto.pseudoRandomBytes(8)`,
      errors: [{ messageId: 'pseudoRandomBytes' }],
    },

    // --- Chained call ---
    {
      code: `getCrypto().pseudoRandomBytes(16)`,
      errors: [{ messageId: 'pseudoRandomBytes' }],
    },

    // --- Used in assignment ---
    {
      code: `const bytes = crypto.pseudoRandomBytes(16)`,
      errors: [{ messageId: 'pseudoRandomBytes' }],
    },

    // --- Used as callback argument ---
    {
      code: `process(crypto.pseudoRandomBytes(16))`,
      errors: [{ messageId: 'pseudoRandomBytes' }],
    },

    // --- Used in a template literal ---
    {
      code: 'const result = `${crypto.pseudoRandomBytes(8)}`',
      errors: [{ messageId: 'pseudoRandomBytes' }],
    },

    // --- Multiple violations ---
    {
      code: `crypto.pseudoRandomBytes(8)\ncrypto.pseudoRandomBytes(16)`,
      errors: [
        { messageId: 'pseudoRandomBytes' },
        { messageId: 'pseudoRandomBytes' },
      ],
    },

    // --- Used with await ---
    {
      code: `async function f() { await crypto.pseudoRandomBytes(16) }`,
      errors: [{ messageId: 'pseudoRandomBytes' }],
    },
  ],
})
