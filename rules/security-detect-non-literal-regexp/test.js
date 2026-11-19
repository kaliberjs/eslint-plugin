const { test } = require('../../machinery/test')

test('security-detect-non-literal-regexp', {
  valid: [
    // === Literal string arguments ===
    `new RegExp('abc')`,
    `new RegExp('abc', 'gi')`,
    `RegExp('abc')`,
    `RegExp('abc', 'i')`,

    // === Regex literal (not a RegExp call at all) ===
    `/abc/`,
    `/abc/gi`,

    // === Template literal without expressions ===
    'new RegExp(`static`)',
    'RegExp(`static`)',
    'new RegExp(`static`, `gi`)',

    // === Numeric literal argument ===
    `new RegExp(42)`,
    `RegExp(0)`,

    // === Boolean literal ===
    `new RegExp(true)`,

    // === __dirname / __filename (isStaticExpression Identifier branch) ===
    `new RegExp(__dirname)`,
    `new RegExp(__filename)`,
    `RegExp(__dirname)`,

    // === Binary expression of literals ===
    `new RegExp('foo' + 'bar')`,
    `RegExp('start' + 'end')`,
    `new RegExp(__dirname + '/pattern')`,
    `new RegExp('prefix' + __filename)`,

    // === import.meta.url / dirname / filename (MemberExpression branch) ===
    `new RegExp(import.meta.url)`,
    `new RegExp(import.meta.dirname)`,
    `new RegExp(import.meta.filename)`,

    // === No arguments at all — should not trigger ===
    `new RegExp()`,
    `RegExp()`,

    // === Not named RegExp — should not trigger ===
    `new MyRegExp(variable)`,
    `SomeOtherFunction(variable)`,
    `new Regexp(variable)`,

    // === Member expression callee — rule only checks Identifier callee ===
    `util.RegExp(variable)`,
    `foo.bar.RegExp(variable)`,
  ],
  invalid: [
    // === NewExpression with variable ===
    {
      code: `new RegExp(variable)`,
      errors: [{ messageId: 'nonLiteralRegexp' }],
    },
    // === CallExpression with variable ===
    {
      code: `RegExp(variable)`,
      errors: [{ messageId: 'nonLiteralRegexp' }],
    },
    // === Function call as argument ===
    {
      code: `new RegExp(getUserInput())`,
      errors: [{ messageId: 'nonLiteralRegexp' }],
    },
    {
      code: `RegExp(getPattern())`,
      errors: [{ messageId: 'nonLiteralRegexp' }],
    },
    // === Template literal WITH expressions ===
    {
      code: 'new RegExp(`${userInput}`)',
      errors: [{ messageId: 'nonLiteralRegexp' }],
    },
    {
      code: 'RegExp(`prefix-${value}-suffix`)',
      errors: [{ messageId: 'nonLiteralRegexp' }],
    },
    // === Binary expression with non-static part ===
    {
      code: `new RegExp(variable + 'suffix')`,
      errors: [{ messageId: 'nonLiteralRegexp' }],
    },
    {
      code: `new RegExp('prefix' + variable)`,
      errors: [{ messageId: 'nonLiteralRegexp' }],
    },
    {
      code: `RegExp(a + b)`,
      errors: [{ messageId: 'nonLiteralRegexp' }],
    },
    // === Conditional / ternary expression ===
    {
      code: `new RegExp(condition ? 'a' : variable)`,
      errors: [{ messageId: 'nonLiteralRegexp' }],
    },
    // === Array/Object expression ===
    {
      code: `new RegExp([pattern])`,
      errors: [{ messageId: 'nonLiteralRegexp' }],
    },
    // === Member expression as argument (non-static) ===
    {
      code: `new RegExp(obj.pattern)`,
      errors: [{ messageId: 'nonLiteralRegexp' }],
    },
    {
      code: `RegExp(config.regex)`,
      errors: [{ messageId: 'nonLiteralRegexp' }],
    },
    // === import.meta with non-whitelisted property ===
    {
      code: `new RegExp(import.meta.env)`,
      errors: [{ messageId: 'nonLiteralRegexp' }],
    },
    // === Nested non-literal in binary expression ===
    {
      code: `new RegExp('safe' + variable + 'safe')`,
      errors: [{ messageId: 'nonLiteralRegexp' }],
    },
    // === Multiple errors in one file ===
    {
      code: `new RegExp(a)\nRegExp(b)`,
      errors: [
        { messageId: 'nonLiteralRegexp' },
        { messageId: 'nonLiteralRegexp' },
      ],
    },
  ],
})
