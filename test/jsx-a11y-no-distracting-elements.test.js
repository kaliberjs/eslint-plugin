const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(jsx-a11y/no-distracting-elements) should report an error for using distracting elements', async () => {
  const result = await lint(`<marquee></marquee>`)
  assertHasWarning(result, 'jsx-a11y/no-distracting-elements')
})
