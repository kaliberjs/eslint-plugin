const { test } = require('../../machinery/test')

test('security-detect-possible-timing-attacks', {
  valid: [
    // Non-security identifiers with all operators
    `if (name === other) {}`,
    `if (count !== total) {}`,
    `if (x == y) {}`,
    `if (a != b) {}`,

    // Literal comparisons (no Identifier node)
    `if ('password' === 'password') {}`,
    `if (42 === 42) {}`,

    // Non-comparison binary operators with security keywords
    `const x = password + secret`,
    `const x = token * 2`,
    `const x = hash / 3`,
    `const x = auth % 10`,
    `const x = pass << 1`,
    `const x = apiKey >> 2`,
    `const x = api >>> 3`,
    `const x = password | 0`,
    `const x = secret & 0xFF`,
    `const x = token ^ mask`,
    `if (password > threshold) {}`,
    `if (token < limit) {}`,
    `if (secret >= min) {}`,
    `if (auth <= max) {}`,

    // Security keyword as member expression property (not an Identifier at the comparison level)
    `if (obj.password === other.password) {}`,
    `if (config.token !== expected) {}`,

    // Security keyword in a function call (not a direct Identifier comparison)
    `if (getPassword() === hash()) {}`,

    // Similar-looking but non-matching names
    `if (passwords === x) {}`,
    `if (username === x) {}`,
    `if (isAuthenticated === true) {}`,
    `if (tokens === list) {}`,
    `if (hashing === true) {}`,
    `if (passport === doc) {}`,

    // ─── NEW: Literal comparison exclusion ───
    // Comparing against string literals is never a timing attack
    // (real attacks compare two dynamic values)
    `if (hash === 'introduction') {}`,
    `if (hash !== '') {}`,
    `if (token === '--help') {}`,
    `if (token === '--strict') {}`,
    `if (password === 'admin') {}`,
    `if (secret !== 'default') {}`,
    `if ('value' === auth) {}`,
    `if ('' !== hash) {}`,

    // Comparing against number literals
    `if (token === 0) {}`,
    `if (hash !== 42) {}`,

    // Comparing against boolean literals
    `if (auth === true) {}`,
    `if (pass !== false) {}`,

    // Comparing against null/undefined
    `if (token === null) {}`,

    // Comparing against template literals
    { code: 'if (hash === `section`) {}', },

    // ─── NEW: Custom keywords option ───
    // With custom keywords, non-listed identifiers are not flagged
    {
      code: `if (hash === other) {}`,
      options: [{ keywords: ['password', 'secret'] }],
    },
    {
      code: `if (token === other) {}`,
      options: [{ keywords: ['password'] }],
    },
  ],

  invalid: [
    // === with each keyword (comparing against dynamic values)
    {
      code: `if (password === other) {}`,
      errors: [{ messageId: 'timingAttack' }],
    },
    {
      code: `if (secret === other) {}`,
      errors: [{ messageId: 'timingAttack' }],
    },
    {
      code: `if (api === other) {}`,
      errors: [{ messageId: 'timingAttack' }],
    },
    {
      code: `if (apiKey === other) {}`,
      errors: [{ messageId: 'timingAttack' }],
    },
    {
      code: `if (token === other) {}`,
      errors: [{ messageId: 'timingAttack' }],
    },
    {
      code: `if (auth === other) {}`,
      errors: [{ messageId: 'timingAttack' }],
    },
    {
      code: `if (pass === other) {}`,
      errors: [{ messageId: 'timingAttack' }],
    },
    {
      code: `if (hash === other) {}`,
      errors: [{ messageId: 'timingAttack' }],
    },

    // !== operator
    {
      code: `if (password !== expected) {}`,
      errors: [{ messageId: 'timingAttack' }],
    },

    // == operator
    {
      code: `if (token == value) {}`,
      errors: [{ messageId: 'timingAttack' }],
    },

    // != operator
    {
      code: `if (secret != value) {}`,
      errors: [{ messageId: 'timingAttack' }],
    },

    // Keyword on the RIGHT side
    {
      code: `if (other === password) {}`,
      errors: [{ messageId: 'timingAttack' }],
    },
    {
      code: `if (x !== token) {}`,
      errors: [{ messageId: 'timingAttack' }],
    },
    {
      code: `if (value == auth) {}`,
      errors: [{ messageId: 'timingAttack' }],
    },
    {
      code: `if (y != hash) {}`,
      errors: [{ messageId: 'timingAttack' }],
    },

    // Case insensitivity — regex has /i flag
    {
      code: `if (PASSWORD === other) {}`,
      errors: [{ messageId: 'timingAttack' }],
    },
    {
      code: `if (Token === other) {}`,
      errors: [{ messageId: 'timingAttack' }],
    },
    {
      code: `if (SECRET === other) {}`,
      errors: [{ messageId: 'timingAttack' }],
    },
    {
      code: `if (Auth !== other) {}`,
      errors: [{ messageId: 'timingAttack' }],
    },

    // Both sides are keywords — still reports (left wins)
    {
      code: `if (password === secret) {}`,
      errors: [{ messageId: 'timingAttack' }],
    },

    // Keyword in ternary condition
    {
      code: `const x = password === y ? 1 : 0`,
      errors: [{ messageId: 'timingAttack' }],
    },

    // Keyword in return statement
    {
      code: `function check() { return token !== x }`,
      errors: [{ messageId: 'timingAttack' }],
    },

    // Keyword in variable assignment
    {
      code: `const isValid = auth === expected`,
      errors: [{ messageId: 'timingAttack' }],
    },

    // Keyword inside logical expression
    {
      code: `if (a && pass === b) {}`,
      errors: [{ messageId: 'timingAttack' }],
    },

    // ─── NEW: Custom keywords option — listed keyword still flags ───
    {
      code: `if (password === other) {}`,
      options: [{ keywords: ['password', 'secret'] }],
      errors: [{ messageId: 'timingAttack' }],
    },
  ],
})
