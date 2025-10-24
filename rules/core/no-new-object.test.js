const test = require('node:test')

// The `no-new-object` rule has been deprecated and its successor, `no-object-constructor`, is not available in the current ESLint version.
test.skip('no-new-object', () => {})
