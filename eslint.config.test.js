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

// Same reason as above, for the four Firebase rules-file rules.
test('the shared config enables the Firebase rules', () => {
  const messages = new Linter().verify(
    `module.exports = () => ({ rules: {
      static: { '.read': true, private: { '.read': false } },
      queue: { $key: {
        '.write': 'auth != null',
        isAdmin: { '.validate': 'newData.isBoolean()' },
        uid: { '.validate': 'newData.isString()' },
      } },
    } })
    `,
    config,
    'createFirebaseRules.js'
  )
  const results = messages.filter(message => message.ruleId.startsWith('@kaliber/firebase-'))

  assert.deepEqual(results.map(message => message.ruleId).sort(), [
    '@kaliber/firebase-client-deletable-write',
    '@kaliber/firebase-client-writable-trust-path',
    '@kaliber/firebase-shadowed-rule',
    '@kaliber/firebase-unbound-uid',
  ])
})
