const { test } = require('../../machinery/test')

test('security-no-unsafe-innerhtml', {
  valid: [
    // Literal string assignment to innerHTML — safe (isStaticExpression: Literal)
    `el.innerHTML = '<p>hello</p>'`,
    `el.innerHTML = ''`,
    `el.innerHTML = "safe"`,

    // Literal string assignment to outerHTML — safe
    `el.outerHTML = '<div>safe</div>'`,

    // Numeric literal
    `el.innerHTML = 42`,

    // Boolean literal
    `el.innerHTML = true`,

    // Null literal
    `el.innerHTML = null`,

    // Template literal WITHOUT expressions — safe (isStaticExpression: TemplateLiteral with 0 expressions)
    'el.innerHTML = `<p>static template</p>`',
    'el.outerHTML = `safe`',

    // __dirname / __filename — safe (isStaticExpression: Identifier __dirname/__filename)
    `el.innerHTML = __dirname`,
    `el.innerHTML = __filename`,

    // Binary expression of literals — safe (isStaticExpression: BinaryExpression with + and static children)
    `el.innerHTML = '<p>' + '</p>'`,
    `el.innerHTML = '<h1>' + 'title' + '</h1>'`,

    // import.meta.url / import.meta.dirname / import.meta.filename — safe (isStaticExpression: MemberExpression)
    `el.innerHTML = import.meta.url`,
    `el.innerHTML = import.meta.dirname`,
    `el.innerHTML = import.meta.filename`,

    // Not innerHTML or outerHTML — safe regardless of value
    `el.textContent = userInput`,
    `el.innerText = userInput`,
    `el.className = userInput`,
    `el.id = userInput`,
    `el.value = userInput`,
    `el.src = userInput`,

    // Not an assignment expression — other usage of innerHTML
    `const x = el.innerHTML`,
    `console.log(el.innerHTML)`,
    `fn(el.innerHTML)`,

    // Not operator '=' (+=) — rule only checks '='
    `el.innerHTML += '<p>more</p>'`,

    // Computed property — property.type !== 'Identifier'
    `el['innerHTML'] = userInput`,

    // Not a MemberExpression on the left
    `innerHTML = userInput`,
  ],

  invalid: [
    // Variable assignment to innerHTML
    {
      code: `el.innerHTML = userInput`,
      errors: [{ messageId: 'unsafeInnerHtml' }],
    },

    // Variable assignment to outerHTML
    {
      code: `el.outerHTML = userInput`,
      errors: [{ messageId: 'unsafeInnerHtml' }],
    },

    // Function call result
    {
      code: `el.innerHTML = getContent()`,
      errors: [{ messageId: 'unsafeInnerHtml' }],
    },
    {
      code: `el.outerHTML = buildHTML()`,
      errors: [{ messageId: 'unsafeInnerHtml' }],
    },

    // Template literal WITH expressions — dynamic, not safe
    {
      code: 'el.innerHTML = `<p>${userInput}</p>`',
      errors: [{ messageId: 'unsafeInnerHtml' }],
    },
    {
      code: 'el.outerHTML = `${content}`',
      errors: [{ messageId: 'unsafeInnerHtml' }],
    },

    // Concatenation with non-static parts
    {
      code: `el.innerHTML = '<p>' + userInput + '</p>'`,
      errors: [{ messageId: 'unsafeInnerHtml' }],
    },

    // Member expression value (obj.prop)
    {
      code: `el.innerHTML = data.html`,
      errors: [{ messageId: 'unsafeInnerHtml' }],
    },

    // Array element
    {
      code: `el.innerHTML = items[0]`,
      errors: [{ messageId: 'unsafeInnerHtml' }],
    },

    // Conditional/ternary expression
    {
      code: `el.innerHTML = isAdmin ? adminHTML : userHTML`,
      errors: [{ messageId: 'unsafeInnerHtml' }],
    },

    // Logical expression
    {
      code: `el.innerHTML = cached || fetchHTML()`,
      errors: [{ messageId: 'unsafeInnerHtml' }],
    },

    // Chained member expression on left side
    {
      code: `document.getElementById('x').innerHTML = userInput`,
      errors: [{ messageId: 'unsafeInnerHtml' }],
    },
    {
      code: `this.el.innerHTML = content`,
      errors: [{ messageId: 'unsafeInnerHtml' }],
    },

    // new expression
    {
      code: `el.innerHTML = new String(input)`,
      errors: [{ messageId: 'unsafeInnerHtml' }],
    },

    // Await expression
    {
      code: `async function f() { el.innerHTML = await fetchContent() }`,
      errors: [{ messageId: 'unsafeInnerHtml' }],
    },

    // Variable that is NOT __dirname or __filename
    {
      code: `el.innerHTML = someVar`,
      errors: [{ messageId: 'unsafeInnerHtml' }],
    },

    // Binary expression with non-static part (variable + literal)
    {
      code: `el.innerHTML = prefix + '</div>'`,
      errors: [{ messageId: 'unsafeInnerHtml' }],
    },

    // outerHTML with chained call
    {
      code: `container.outerHTML = render()`,
      errors: [{ messageId: 'unsafeInnerHtml' }],
    },
  ],
})
