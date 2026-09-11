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
      *gen() {};
      agen = function* () {};
    }`,
    config,
    'test.js'
  )
  const results = messages.filter(message => message.ruleId === 'no-restricted-syntax')

  assert.deepEqual(results.map(message => message.message), [
    'Use an arrow function class property so `this` is bound: `name = () => {}`',
    'Use an arrow function so `this` is bound: `name = () => {}`',
    'A generator cannot be an arrow function, bind `this` in the constructor: `this.name = name.bind(this)`',
    'A generator cannot be an arrow function, bind `this` in the constructor: `this.name = name.bind(this)`',
  ])
})

test('`this` assignments must be arrow functions', () => {
  const messages = new Linter().verify(
    `class Good {
      constructor() {
        this.agen = agen.bind(this);
        this.ok = () => {};
      }
    }`,
    config,
    'test.js'
  )
  const results = messages.filter(message => message.ruleId === 'no-restricted-syntax')

  assert.deepEqual(results.map(message => message.message), [])
})

test('`this` assignments must not be named or anonymous functions', () => {
  const messages = new Linter().verify(
    `class Bad {
      constructor() {
        this.worse = function named() {};
        this.bad1 = function () {};
        this.bad2 = func;
        this.bad4 = generatorFunc;
        this.gen = function* () {};
      }
    }`,
    config,
    'test.js'
  )
  const results = messages.filter(message => message.ruleId === 'no-restricted-syntax')

  assert.deepEqual(results.map(message => message.message), [
    'Use an arrow function so `this` is bound: `this.name = () => {}`',
    'Use an arrow function so `this` is bound: `this.name = () => {}`',
    'A generator cannot be an arrow function, bind `this` in the constructor: `this.name = name.bind(this)`',
  ])
})
