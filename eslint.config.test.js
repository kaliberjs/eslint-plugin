const assert = require('node:assert/strict')
const { test } = require('node:test')
const { Linter } = require('eslint')

const config = require('./eslint.config')

test('parses JSX with the shared config', () => {
  const messages = new Linter().verify('const element = <div />', config)
  const fatalMessages = messages.filter(message => message.fatal)

  assert.deepEqual(fatalMessages, [])
})

// RuleTester takes the rule object directly, so rules/bound-instance-methods/test.js
// keeps passing when the shared config never enables the rule. This is the only test
// that fails if the `@kaliber/bound-instance-methods` entry is dropped from the config.
test('the shared config enables bound-instance-methods', () => {
  const messages = new Linter().verify(
    `class Bad {
      bad() {};
      agen = function* () {};

      constructor() {
        this.worse = value;

        function value() {};
      }
    }`,
    config,
    'test.js'
  )
  const results = messages.filter(message => message.ruleId === '@kaliber/bound-instance-methods')

  assert.deepEqual(results.map(message => message.messageId), [
    'useArrowFunction',
    'bindGenerator',
    'bindReference',
  ])
})
