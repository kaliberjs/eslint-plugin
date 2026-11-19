const { test } = require('../../machinery/test')

test('security-no-insecure-random', {
  valid: [
    // --- Safe alternatives ---
    `crypto.randomBytes(16)`,
    `crypto.randomUUID()`,
    `crypto.getRandomValues(new Uint32Array(1))`,

    // --- Math but not random ---
    `Math.floor(x)`,
    `Math.ceil(x)`,
    `Math.round(x)`,
    `Math.abs(x)`,
    `Math.max(a, b)`,
    `Math.min(a, b)`,
    `Math.pow(2, 10)`,
    `Math.sqrt(9)`,
    `Math.PI`,

    // --- random but not Math ---
    `crypto.random()`,
    `myLib.random()`,
    `window.random()`,
    `this.random()`,
    `_.random(1, 10)`,

    // --- Object is not an Identifier (it's a CallExpression) ---
    `getMath().random()`,

    // --- Computed property access ---
    `Math['random']()`,
    `Math[\`random\`]()`,

    // --- Not a call expression (property access without invocation) ---
    `const fn = Math.random`,
    `void Math.random`,

    // --- Case sensitivity — different casing ---
    `Math.Random()`,
    `math.random()`,
    `MATH.random()`,
    `MATH.RANDOM()`,

    // --- Member of member (Math is a property, not an identifier) ---
    `window.Math.random()`,
    `global.Math.random()`,

    // --- Different AST node type for callee ---
    `random()`,
  ],
  invalid: [
    // --- Basic case ---
    {
      code: `Math.random()`,
      errors: [{ messageId: 'insecureRandom' }],
    },

    // --- Used in arithmetic ---
    {
      code: `const x = Math.random() * 100`,
      errors: [{ messageId: 'insecureRandom' }],
    },
    {
      code: `Math.floor(Math.random() * 10)`,
      errors: [{ messageId: 'insecureRandom' }],
    },

    // --- Used in assignment ---
    {
      code: `let rand = Math.random()`,
      errors: [{ messageId: 'insecureRandom' }],
    },

    // --- Used in ternary ---
    {
      code: `const x = Math.random() > 0.5 ? 'a' : 'b'`,
      errors: [{ messageId: 'insecureRandom' }],
    },

    // --- Used as function argument ---
    {
      code: `doSomething(Math.random())`,
      errors: [{ messageId: 'insecureRandom' }],
    },

    // --- Used in array ---
    {
      code: `const arr = [Math.random(), Math.random()]`,
      errors: [
        { messageId: 'insecureRandom' },
        { messageId: 'insecureRandom' },
      ],
    },

    // --- Used in template literal ---
    {
      code: 'const id = `id-${Math.random()}`',
      errors: [{ messageId: 'insecureRandom' }],
    },

    // --- Used in return statement ---
    {
      code: `function getId() { return Math.random() }`,
      errors: [{ messageId: 'insecureRandom' }],
    },

    // --- Used in arrow function ---
    {
      code: `const getRand = () => Math.random()`,
      errors: [{ messageId: 'insecureRandom' }],
    },

    // --- Used in conditional ---
    {
      code: `if (Math.random() > 0.5) {}`,
      errors: [{ messageId: 'insecureRandom' }],
    },

    // --- Used in loop ---
    {
      code: `while (Math.random() > 0.1) { break }`,
      errors: [{ messageId: 'insecureRandom' }],
    },

    // --- Used with toString ---
    {
      code: `Math.random().toString(36)`,
      errors: [{ messageId: 'insecureRandom' }],
    },

    // --- Common ID generation pattern ---
    {
      code: `Math.random().toString(36).substring(2)`,
      errors: [{ messageId: 'insecureRandom' }],
    },

    // --- Multiple on one line ---
    {
      code: `const a = Math.random() + Math.random()`,
      errors: [
        { messageId: 'insecureRandom' },
        { messageId: 'insecureRandom' },
      ],
    },

    // --- Inside class method ---
    {
      code: `class Foo { bar() { return Math.random() } }`,
      errors: [{ messageId: 'insecureRandom' }],
    },

    // --- Exported ---
    {
      code: `export const rand = Math.random()`,
      errors: [{ messageId: 'insecureRandom' }],
    },
  ],
})
