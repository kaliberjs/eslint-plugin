const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(react/void-dom-elements-no-children) should report an error for children in void elements', async () => {
  const result = await lint(`<br>hello</br>`)
  assertHasWarning(result, 'react/void-dom-elements-no-children')
})
