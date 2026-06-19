const { test } = require('../../machinery/test')

test('prose-no-opaque-identifiers', {
  valid: [
    `const currentUser = getUser()`,
    `const id = getId()`,
    `for (let i = 0; i < items.length; i++) process(items[i])`,
    `function renderArticle(article) { return article.title }`,
    `const { title, description } = article`,
    {
      code: `const x = point.x`,
      options: [{ allowedNames: ['x'] }],
    },
  ],
  invalid: [
    {
      code: `const d = new Date()`,
      errors: [{ messageId: 'opaqueIdentifier' }],
    },
    {
      code: `const i = getCurrentIndex()`,
      errors: [{ messageId: 'opaqueIdentifier' }],
    },
    {
      code: `const cfg = loadConfig()`,
      errors: [{ messageId: 'opaqueIdentifier' }],
    },
    {
      code: `function render(p) { return p.title }`,
      errors: [{ messageId: 'opaqueIdentifier' }],
    },
    {
      code: `const { a, b } = getConfig()`,
      errors: [
        { messageId: 'opaqueIdentifier' },
        { messageId: 'opaqueIdentifier' },
      ],
    },
    {
      code: `const [x, y] = point`,
      errors: [
        { messageId: 'opaqueIdentifier' },
        { messageId: 'opaqueIdentifier' },
      ],
    },
  ],
})
