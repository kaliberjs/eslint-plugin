const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(react/jsx-wrap-multilines) should report an error for missing parens', async () => {
  const result = await lint(`
    const a = <div>
      <p>hello</p>
    </div>
  `)
  assertHasWarning(result, 'react/jsx-wrap-multilines')
})
