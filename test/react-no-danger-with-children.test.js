const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(react/no-danger-with-children) should report an error for using children with dangerouslySetInnerHTML', async () => {
  const result = await lint(`<div dangerouslySetInnerHTML={{ __html: 'hello' }}>hello</div>`)
  assertHasWarning(result, 'react/no-danger-with-children')
})
