const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(jsx-a11y/aria-proptypes) should report an error for invalid aria proptype', async () => {
  const result = await lint(`<div aria-hidden="truee"></div>`)
  assertHasWarning(result, 'jsx-a11y/aria-proptypes')
})
