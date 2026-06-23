const { test } = require('../../machinery/test')

test('prose-no-opaque-identifiers', {
  valid: [
    `const currentUser = getUser()`,
    `const id = getId()`,
    `for (let i = 0; i < items.length; i++) process(items[i])`,
    `function renderArticle(article) { return article.title }`,
    `const { title, description } = article`,
    `const { title: articleTitle, description: articleDescription } = article`,
    `const [firstPoint, secondPoint] = points`,
    `try { run() } catch (error) { report(error) }`,
    `items.map((item, index) => render(item, index))`,
    `const db = connect()`,
    `const cx = getClassName()`,
    `const el = ref.current`,
    `function onSubmit(event) { return event }`,
    {
      code: `const x = point.x`,
      options: [{ allowedNames: ['x'] }],
    },
    {
      code: `const idx = getCurrentIndex()`,
      options: [{ minLength: 3 }],
    },
    {
      code: `const tmp = createTemporaryDirectory()`,
      options: [{ allowedNames: ['tmp'] }],
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
    {
      code: `const { cfg } = loadConfig()`,
      errors: [{ messageId: 'opaqueIdentifier' }],
    },
    {
      code: `const { config: cfg } = loadConfig()`,
      errors: [{ messageId: 'opaqueIdentifier' }],
    },
    {
      code: `try { run() } catch (e) { report(e) }`,
      errors: [{ messageId: 'opaqueIdentifier' }],
    },
    {
      code: `function renderArticle(a) { return a.title }`,
      errors: [{ messageId: 'opaqueIdentifier' }],
    },
    {
      code: `const tmp = createTemporaryDirectory()`,
      errors: [{ messageId: 'opaqueIdentifier' }],
    },
    {
      code: `const thing = getCurrentArticle()`,
      errors: [{ messageId: 'opaqueIdentifier' }],
    },
    {
      code: `const foo = getCurrentArticle()`,
      errors: [{ messageId: 'opaqueIdentifier' }],
    },
    {
      code: `for (let itemIndex = 0; itemIndex < items.length; itemIndex++) { const x = items[itemIndex] }`,
      errors: [{ messageId: 'opaqueIdentifier' }],
    },
    {
      code: `for (let i = 0; i < items.length; i++) process(items[i])`,
      options: [{ allowLoopIndexes: false }],
      errors: [{ messageId: 'opaqueIdentifier' }],
    },
  ],
})
