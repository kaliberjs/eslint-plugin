const assert = require('node:assert/strict')
const { test } = require('node:test')
const { Linter } = require('eslint')

const config = require('./eslint.config')

test('parses JSX with the shared config', () => {
  const messages = new Linter().verify('const element = <div />', config)
  const fatalMessages = messages.filter(message => message.fatal)

  assert.deepEqual(fatalMessages, [])
})

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
