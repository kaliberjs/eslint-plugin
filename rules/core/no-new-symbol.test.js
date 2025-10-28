const test = require('node:test')

// The `no-new-symbol` rule has been deprecated and its successor, `no-new-native-nonconstructor`, is not available in the current ESLint version.
test.skip('no-new-symbol', () => {})
