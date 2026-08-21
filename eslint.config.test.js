const assert = require('node:assert/strict')
const { test } = require('node:test')
const { Linter } = require('eslint')

const config = require('./eslint.config')

test('parses JSX with the shared config', () => {
  const messages = new Linter().verify('const element = <div />', config)
  const fatalMessages = messages.filter(message => message.fatal)

  assert.deepEqual(fatalMessages, [])
})
