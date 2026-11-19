const { test } = require('../../machinery/test')

test('security-detect-eval-with-expression', {
  valid: [
    // --- Static literals are safe ---
    `eval('alert(1)')`,
    `eval("hello world")`,
    `eval(42)`,
    `eval(true)`,
    `eval(false)`,
    `eval(null)`,

    // --- Template literal without expressions is safe ---
    `eval(\`static string\`)`,

    // --- __dirname / __filename are safe ---
    `eval(__dirname)`,
    `eval(__filename)`,

    // --- BinaryExpression with + and static operands is safe ---
    `eval('hello' + ' world')`,
    `eval(__dirname + '/file.js')`,
    `eval('prefix' + \`suffix\`)`,
    `eval(__dirname + '/' + __filename)`,

    // --- BinaryExpression with non-+ operator but static operands is safe ---
    `eval('a' - 'b')`,

    // --- import.meta.url / dirname / filename are safe ---
    `eval(import.meta.url)`,
    `eval(import.meta.dirname)`,
    `eval(import.meta.filename)`,

    // --- No arguments → skipped (arguments.length === 0) ---
    `eval()`,

    // --- Not an eval call → different callee name ---
    `notEval(userInput)`,
    `evaluate(variable)`,
    `doEval(someExpression)`,
    `EVAL(userInput)`,

    // --- Callee is not an Identifier (MemberExpression) ---
    `window.eval(userInput)`,
    `global.eval(variable)`,
    `obj.eval(x)`,
  ],
  invalid: [
    // --- Variable reference ---
    {
      code: `eval(userInput)`,
      errors: [{ messageId: 'evalWithExpression' }],
    },

    // --- Function call as argument ---
    {
      code: `eval(getValue())`,
      errors: [{ messageId: 'evalWithExpression' }],
    },

    // --- BinaryExpression with non-static operand ---
    {
      code: `eval(a + b)`,
      errors: [{ messageId: 'evalWithExpression' }],
    },
    {
      code: `eval('prefix' + variable)`,
      errors: [{ messageId: 'evalWithExpression' }],
    },
    {
      code: `eval(variable + 'suffix')`,
      errors: [{ messageId: 'evalWithExpression' }],
    },

    // --- Template literal WITH expressions ---
    {
      code: 'eval(`hello ${name}`)',
      errors: [{ messageId: 'evalWithExpression' }],
    },
    {
      code: 'eval(`${a}${b}`)',
      errors: [{ messageId: 'evalWithExpression' }],
    },

    // --- Complex expressions ---
    {
      code: `eval(condition ? 'a' : 'b')`,
      errors: [{ messageId: 'evalWithExpression' }],
    },
    {
      code: `eval(obj.property)`,
      errors: [{ messageId: 'evalWithExpression' }],
    },
    {
      code: `eval(arr[0])`,
      errors: [{ messageId: 'evalWithExpression' }],
    },

    // --- new expression as argument ---
    {
      code: `eval(new String('x'))`,
      errors: [{ messageId: 'evalWithExpression' }],
    },

    // --- Identifier that is NOT __dirname/__filename ---
    {
      code: `eval(dirname)`,
      errors: [{ messageId: 'evalWithExpression' }],
    },
    {
      code: `eval(filename)`,
      errors: [{ messageId: 'evalWithExpression' }],
    },

    // --- Arrow function / function expression ---
    {
      code: `eval(() => {})`,
      errors: [{ messageId: 'evalWithExpression' }],
    },

    // --- Logical expression ---
    {
      code: `eval(a || b)`,
      errors: [{ messageId: 'evalWithExpression' }],
    },

    // --- Assignment expression as argument ---
    {
      code: `eval(x = 'code')`,
      errors: [{ messageId: 'evalWithExpression' }],
    },

    // --- Spread element doesn't count as static ---
    {
      code: `eval(...args)`,
      errors: [{ messageId: 'evalWithExpression' }],
    },

    // --- Only first argument is checked, but first is dynamic ---
    {
      code: `eval(userInput, 'extra')`,
      errors: [{ messageId: 'evalWithExpression' }],
    },
  ],
})
