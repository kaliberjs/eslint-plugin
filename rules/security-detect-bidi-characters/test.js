const { test } = require('../../machinery/test')

test('security-detect-bidi-characters', {
  valid: [
    // Normal code — no bidi characters
    `const x = 1`,
    `const name = 'hello'`,
    `function add(a, b) { return a + b }`,
    `const obj = { key: 'value' }`,

    // Normal Unicode — non-bidi
    `const emoji = '😀'`,
    `const chinese = '你好'`,
    `const accented = 'café'`,
    `const multiline = 'line1\\nline2'`,

    // Empty code
    ``,

    // Template literal with normal text
    'const x = `hello world`',

    // Comment with normal text
    `// this is a normal comment`,
    `/* block comment */`,

    // Various safe escape sequences
    `const x = '\\u0041'`, // just the letter A as an escape
    `const x = '\\n\\t\\r'`,
  ],

  invalid: [
    // U+202A LEFT-TO-RIGHT EMBEDDING — in string
    {
      code: 'const x = "' + '\u202A' + '"',
      errors: [{ messageId: 'bidiCharacter' }],
    },
    // U+202B RIGHT-TO-LEFT EMBEDDING — in string
    {
      code: 'const x = "' + '\u202B' + '"',
      errors: [{ messageId: 'bidiCharacter' }],
    },
    // U+202C POP DIRECTIONAL FORMATTING — in string
    {
      code: 'const x = "' + '\u202C' + '"',
      errors: [{ messageId: 'bidiCharacter' }],
    },
    // U+202D LEFT-TO-RIGHT OVERRIDE — in string
    {
      code: 'const x = "' + '\u202D' + '"',
      errors: [{ messageId: 'bidiCharacter' }],
    },
    // U+202E RIGHT-TO-LEFT OVERRIDE — in string
    {
      code: 'const x = "' + '\u202E' + '"',
      errors: [{ messageId: 'bidiCharacter' }],
    },
    // U+2066 LEFT-TO-RIGHT ISOLATE — in string
    {
      code: 'const x = "' + '\u2066' + '"',
      errors: [{ messageId: 'bidiCharacter' }],
    },
    // U+2067 RIGHT-TO-LEFT ISOLATE — in string
    {
      code: 'const x = "' + '\u2067' + '"',
      errors: [{ messageId: 'bidiCharacter' }],
    },
    // U+2068 FIRST STRONG ISOLATE — in string
    {
      code: 'const x = "' + '\u2068' + '"',
      errors: [{ messageId: 'bidiCharacter' }],
    },
    // U+2069 POP DIRECTIONAL ISOLATE — in string
    {
      code: 'const x = "' + '\u2069' + '"',
      errors: [{ messageId: 'bidiCharacter' }],
    },
    // U+061C ARABIC LETTER MARK — in string
    {
      code: 'const x = "' + '\u061C' + '"',
      errors: [{ messageId: 'bidiCharacter' }],
    },

    // Multiple bidi chars on same line — each reports separately
    {
      code: 'const x = "' + '\u202A' + '\u202B' + '"',
      errors: [
        { messageId: 'bidiCharacter' },
        { messageId: 'bidiCharacter' },
      ],
    },

    // Bidi char in a comment — Trojan Source attack vector
    {
      code: '// comment ' + '\u202A' + ' here\nconst x = 1',
      errors: [{ messageId: 'bidiCharacter' }],
    },

    // Bidi char in template literal
    {
      code: 'const x = `' + '\u2066' + '`',
      errors: [{ messageId: 'bidiCharacter' }],
    },

    // Bidi chars on multiple lines — one error per char
    {
      code: 'const a = "' + '\u202A' + '"\nconst b = "' + '\u202B' + '"',
      errors: [
        { messageId: 'bidiCharacter' },
        { messageId: 'bidiCharacter' },
      ],
    },

    // Three bidi chars on one line
    {
      code: 'const x = "' + '\u202A' + '\u202D' + '\u2069' + '"',
      errors: [
        { messageId: 'bidiCharacter' },
        { messageId: 'bidiCharacter' },
        { messageId: 'bidiCharacter' },
      ],
    },

    // Trojan source attack pattern — bidi in block comment to hide code
    {
      code: '/* ' + '\u202A' + '\u202B' + ' */ const admin = true',
      errors: [
        { messageId: 'bidiCharacter' },
        { messageId: 'bidiCharacter' },
      ],
    },

    // U+200E LEFT-TO-RIGHT MARK in comment (outside identifiers, parseable)
    {
      code: '// test ' + '\u200E' + ' mark\nconst x = 1',
      errors: [{ messageId: 'bidiCharacter' }],
    },

    // U+200F RIGHT-TO-LEFT MARK in string
    {
      code: 'const x = "' + '\u200F' + '"',
      errors: [{ messageId: 'bidiCharacter' }],
    },
  ],
})
