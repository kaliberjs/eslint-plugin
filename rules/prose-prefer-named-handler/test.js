const { test } = require('../../machinery/test')

test('prose-prefer-named-handler', {
  valid: [
    // Named handler reference
    '<Button onClick={handleClick} />',
    // Single expression body (no block)
    '<Button onClick={() => setOpen(true)} />',
    // Single expression
    '<Input onChange={(e) => setName(e.target.value)} />',
    // Single statement block body (within default maxStatements: 1)
    '<Button onClick={() => { handleClick() }} />',
    // Named function reference
    '<Form onSubmit={handleSubmit} />',
    // Not an event handler prop (no on prefix)
    '<Component render={() => { doA(); doB() }} />',
    // Non-JSX context (should not trigger)
    'element.addEventListener("click", () => { doA(); doB() })',
    // With maxStatements: 2 option, 2 statements is fine
    {
      code: '<Button onClick={() => { setOpen(true); track("click") }} />',
      options: [{ maxStatements: 2 }],
    },
  ],
  invalid: [
    // Two statements in block body
    {
      code: '<Button onClick={() => { setOpen(true); track("click") }} />',
      errors: [{ messageId: 'namedHandler' }],
    },
    // Three statements
    {
      code: '<Button onClick={() => { setSubmitting(true); submitOrder(cart); navigate("/done") }} />',
      errors: [{ messageId: 'namedHandler' }],
    },
    // onChange with block body
    {
      code: '<Input onChange={(e) => { onChange(e.target.files[0]); onBlur(e) }} />',
      errors: [{ messageId: 'namedHandler' }],
    },
    // onSubmit with conditional logic
    {
      code: '<Form onSubmit={(e) => { e.preventDefault(); submit(e.target) }} />',
      errors: [{ messageId: 'namedHandler' }],
    },
    // Function expression (not just arrow)
    {
      code: '<Button onClick={function() { doA(); doB() }} />',
      errors: [{ messageId: 'namedHandler' }],
    },
    // With maxStatements: 0, even single statement is reported
    {
      code: '<Button onClick={() => { handleClick() }} />',
      options: [{ maxStatements: 0 }],
      errors: [{ messageId: 'namedHandler' }],
    },
  ],
})
