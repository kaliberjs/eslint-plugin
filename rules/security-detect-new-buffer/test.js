const { test } = require('../../machinery/test')

test('security-detect-new-buffer', {
  valid: [
    // --- Static literal arguments are safe ---
    `new Buffer(10)`,
    `new Buffer('hello')`,
    `new Buffer("hello")`,
    `new Buffer(true)`,
    `new Buffer(null)`,

    // --- Template literal without expressions ---
    `new Buffer(\`static\`)`,

    // --- __dirname / __filename ---
    `new Buffer(__dirname)`,
    `new Buffer(__filename)`,

    // --- BinaryExpression with + and static operands ---
    `new Buffer('hello' + ' world')`,
    `new Buffer(__dirname + '/file')`,

    // --- BinaryExpression with non-+ operator but static operands is safe ---
    `new Buffer(10 * 1024)`,

    // --- import.meta properties ---
    `new Buffer(import.meta.url)`,
    `new Buffer(import.meta.dirname)`,
    `new Buffer(import.meta.filename)`,

    // --- No arguments → skipped ---
    `new Buffer()`,

    // --- Different constructor name ---
    `new ArrayBuffer(variable)`,
    `new SharedArrayBuffer(userInput)`,
    `new Uint8Array(size)`,
    `new CustomBuffer(variable)`,
    `new BUFFER(variable)`,

    // --- Callee is not an Identifier (MemberExpression) ---
    `new Buffer.alloc(variable)`,
    `new global.Buffer(variable)`,

    // --- Buffer used as function call, not constructor ---
    `Buffer(variable)`,
    `Buffer.from(variable)`,
    `Buffer.alloc(variable)`,
  ],
  invalid: [
    // --- Variable reference ---
    {
      code: `new Buffer(userInput)`,
      errors: [{ messageId: 'newBuffer' }],
    },
    {
      code: `new Buffer(size)`,
      errors: [{ messageId: 'newBuffer' }],
    },

    // --- Function call as argument ---
    {
      code: `new Buffer(getSize())`,
      errors: [{ messageId: 'newBuffer' }],
    },
    {
      code: `new Buffer(parseInt(x))`,
      errors: [{ messageId: 'newBuffer' }],
    },

    // --- Template literal with expression ---
    {
      code: 'new Buffer(`${size}`)',
      errors: [{ messageId: 'newBuffer' }],
    },

    // --- BinaryExpression with non-static operand ---
    {
      code: `new Buffer('prefix' + variable)`,
      errors: [{ messageId: 'newBuffer' }],
    },
    {
      code: `new Buffer(a + b)`,
      errors: [{ messageId: 'newBuffer' }],
    },

    // --- Object/array literal ---
    {
      code: `new Buffer([1, 2, 3])`,
      errors: [{ messageId: 'newBuffer' }],
    },
    {
      code: `new Buffer({ length: 10 })`,
      errors: [{ messageId: 'newBuffer' }],
    },

    // --- Conditional expression ---
    {
      code: `new Buffer(safe ? 10 : 20)`,
      errors: [{ messageId: 'newBuffer' }],
    },

    // --- MemberExpression (not import.meta) ---
    {
      code: `new Buffer(config.size)`,
      errors: [{ messageId: 'newBuffer' }],
    },
    {
      code: `new Buffer(process.env.SIZE)`,
      errors: [{ messageId: 'newBuffer' }],
    },

    // --- Identifier that is NOT __dirname/__filename ---
    {
      code: `new Buffer(dirname)`,
      errors: [{ messageId: 'newBuffer' }],
    },

    // --- Only first argument checked, but first is dynamic ---
    {
      code: `new Buffer(size, 'utf8')`,
      errors: [{ messageId: 'newBuffer' }],
    },

    // --- Logical expression ---
    {
      code: `new Buffer(a || 1024)`,
      errors: [{ messageId: 'newBuffer' }],
    },

    // --- Unary expression ---
    {
      code: `new Buffer(-size)`,
      errors: [{ messageId: 'newBuffer' }],
    },
  ],
})
