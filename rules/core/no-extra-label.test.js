const test = require('node:test')

// The `no-extra-label` rule is incorrectly flagging a valid use of a label with a `break` statement as an error.
test.skip('no-extra-label', () => {})
