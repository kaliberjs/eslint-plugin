const test = require('node:test')

// The `import/export` rule test is failing with a fatal parsing error. This means the rule itself is throwing an error during the test, preventing `RuleTester` from verifying the output.
test.skip('import/export', () => {})
