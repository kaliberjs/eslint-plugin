const { test } = require('../../machinery/test')

test('security-no-unsafe-deserialization', {
  valid: [
    // eval with a string literal (not concatenation)
    `eval("console.log('hi')")`,

    // eval with a variable (not BinaryExpression)
    `eval(code)`,

    // eval with no arguments
    `eval()`,

    // eval with a template literal
    "eval(`some code`)",

    // eval with BinaryExpression but not + operator
    `eval(a - b)`,
    `eval(a * b)`,

    // JSON.parse (safe deserialization)
    `JSON.parse(data)`,
    `JSON.parse('{"key": "value"}')`,

    // new Function with string literal argument
    `new Function("return 42")`,

    // new Function with no arguments
    `new Function()`,

    // Regular function call (not unserialize/deserialize)
    `serialize(data)`,
    `parse(data)`,
    `decode(data)`,

    // Method call (not bare Identifier)
    `obj.unserialize(data)`,
    `obj.deserialize(data)`,

    // new Something (not Function)
    `new Worker(userInput)`,
    `new Date(userInput)`,

    // Arrow function (not new Function)
    `const fn = () => userInput`,

    // Function declaration (not new Function)
    `function myFunc() { return 42 }`,
  ],
  invalid: [
    // eval with string concatenation (classic deserialization attack vector)
    {
      code: `eval("(" + userInput + ")")`,
      errors: [{ messageId: 'unsafeDeserialization' }],
    },
    // eval with variable concatenation
    {
      code: `eval(prefix + data)`,
      errors: [{ messageId: 'unsafeDeserialization' }],
    },
    // eval with concatenation of response
    {
      code: `eval("var x = " + response.body)`,
      errors: [{ messageId: 'unsafeDeserialization' }],
    },
    // eval with nested concatenation (still BinaryExpression +)
    {
      code: `eval(a + b + c)`,
      errors: [{ messageId: 'unsafeDeserialization' }],
    },
    // unserialize with argument
    {
      code: `unserialize(data)`,
      errors: [{ messageId: 'unsafeDeserialization' }],
    },
    // unserialize with string literal
    {
      code: `unserialize("serialized_data")`,
      errors: [{ messageId: 'unsafeDeserialization' }],
    },
    // unserialize with no arguments (still flags)
    {
      code: `unserialize()`,
      errors: [{ messageId: 'unsafeDeserialization' }],
    },
    // deserialize with argument
    {
      code: `deserialize(buffer)`,
      errors: [{ messageId: 'unsafeDeserialization' }],
    },
    // deserialize with string
    {
      code: `deserialize("payload")`,
      errors: [{ messageId: 'unsafeDeserialization' }],
    },
    // new Function with variable (untrusted input)
    {
      code: `new Function(userInput)`,
      errors: [{ messageId: 'unsafeDeserialization' }],
    },
    // new Function with Identifier
    {
      code: `new Function(code)`,
      errors: [{ messageId: 'unsafeDeserialization' }],
    },
    // new Function with call expression argument
    {
      code: `new Function(getCode())`,
      errors: [{ messageId: 'unsafeDeserialization' }],
    },
    // new Function with MemberExpression argument
    {
      code: `new Function(req.body)`,
      errors: [{ messageId: 'unsafeDeserialization' }],
    },
    // new Function with template literal (not a Literal)
    {
      code: "new Function(`return ${value}`)",
      errors: [{ messageId: 'unsafeDeserialization' }],
    },
    // new Function with BinaryExpression argument
    {
      code: `new Function("return " + code)`,
      errors: [{ messageId: 'unsafeDeserialization' }],
    },
    // Realistic: eval concatenation in handler
    {
      code: `function handle(req) {\n  eval("(" + req.body + ")")\n}`,
      errors: [{ messageId: 'unsafeDeserialization' }],
    },
    // Realistic: deserialize in route handler
    {
      code: `app.post('/data', (req, res) => {\n  const obj = deserialize(req.body)\n})`,
      errors: [{ messageId: 'unsafeDeserialization' }],
    },
  ],
})
