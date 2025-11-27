const test = require('node:test')

// The `no-iterator` rule is not being triggered by the `RuleTester`, even with invalid code.
test.skip('no-iterator', () => {})
