const assert = require('node:assert/strict')
const { test } = require('node:test')
const { Linter } = require('eslint')

const config = require('./eslint.config')

test('parses JSX with the shared config', () => {
  const messages = new Linter().verify('const element = <div />', config)
  const fatalMessages = messages.filter(message => message.fatal)

  assert.deepEqual(fatalMessages, [])
})

test('class methods must be arrow function properties', () => {
  const messages = new Linter().verify(
    `class Good {
      constructor() {};
      get x() { return 1 };
      static make() {};
      static create = function () {};
      *gen() {};
      agen = function* () {};
      ok = () => {};
    }`,
    config,
    'test.js'
  )
  const results = messages.filter(message => message.ruleId === 'no-restricted-syntax')

  assert.deepEqual(results.map(message => message.message), [])
})

test('class methods not must be named or anonymous functions', () => {
  const messages = new Linter().verify(
    `class Bad {
      bad() {};
      worse = function () {};
    }`,
    config,
    'test.js'
  )
  const results = messages.filter(message => message.ruleId === 'no-restricted-syntax')

  assert.deepEqual(results.map(message => message.message), [
    'Use an arrow function class property so `this` is bound: `name = () => {}`',
    'Use an arrow function so `this` is bound: `name = () => {}`',
  ])
})
