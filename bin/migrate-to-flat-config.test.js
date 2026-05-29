'use strict'

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { migrate, generateOutput, stripJsonComments } = require('./migrate-to-flat-config')

describe('migrate', () => {
  it('produces no overrides for a config matching the shared config', () => {
    const config = {
      parser: '@babel/eslint-parser',
      plugins: ['import', 'jsx-a11y', 'react', 'react-hooks', '@kaliber/eslint-plugin'],
      root: true,
      env: { browser: true, commonjs: true, es6: true, jest: true, node: true },
      globals: { Component: true, React: true, cx: true },
      rules: {},
    }

    const result = migrate(config)
    assert.deepEqual(result.overrideRules, {})
    assert.deepEqual(result.customGlobals, {})
    assert.equal(result.warnings.length, 0)
  })

  it('renames deprecated core rules', () => {
    const config = {
      rules: {
        'no-native-reassign': 'warn',
        'no-negated-in-lhs': 'warn',
        'no-new-object': 'warn',
        'no-new-symbol': 'warn',
      },
    }

    const result = migrate(config)
    assert.ok('no-global-assign' in result.overrideRules)
    assert.ok('no-unsafe-negation' in result.overrideRules)
    assert.ok('no-object-constructor' in result.overrideRules)
    assert.ok('no-new-native-nonconstructor' in result.overrideRules)

    assert.ok(!('no-native-reassign' in result.overrideRules))
    assert.ok(!('no-negated-in-lhs' in result.overrideRules))

    const renameWarnings = result.warnings.filter(w => w.includes('Renamed deprecated'))
    assert.equal(renameWarnings.length, 4)
  })

  it('moves stylistic rules to @stylistic namespace', () => {
    const config = {
      rules: {
        'indent': ['warn', 2],
        'semi': ['warn', 'never'],
        'quotes': ['warn', 'single'],
      },
    }

    const result = migrate(config)
    assert.ok('@stylistic/indent' in result.overrideRules || result.warnings.some(w => w.includes('indent')))
    assert.ok('@stylistic/semi' in result.overrideRules || result.warnings.some(w => w.includes('semi')))
    assert.ok('@stylistic/quotes' in result.overrideRules || result.warnings.some(w => w.includes('quotes')))
  })

  it('remaps import/ prefix to import-x/', () => {
    const config = {
      rules: {
        'import/first': 'warn',
        'import/no-amd': 'error',
        'import/custom-rule': 'warn',
      },
    }

    const result = migrate(config)
    const ruleNames = Object.keys(result.overrideRules)
    assert.ok(ruleNames.some(r => r.startsWith('import-x/')))
    assert.ok(!ruleNames.some(r => r.startsWith('import/')))
  })

  it('removes rules with no ESLint v9 replacement', () => {
    const config = {
      rules: {
        'no-return-await': 'warn',
        'jsx-a11y/accessible-emoji': 'warn',
        'jsx-a11y/scope': 'warn',
      },
    }

    const result = migrate(config)
    assert.ok(!('no-return-await' in result.overrideRules))
    assert.ok(!('jsx-a11y/accessible-emoji' in result.overrideRules))
    assert.ok(!('jsx-a11y/scope' in result.overrideRules))

    const removedWarnings = result.warnings.filter(w => w.includes('Removed rule'))
    assert.equal(removedWarnings.length, 3)
  })

  it('extracts custom globals (beyond Component, React, cx)', () => {
    const config = {
      globals: {
        Component: true,
        React: true,
        cx: true,
        myCustomGlobal: true,
        SOME_CONST: false,
      },
      rules: {},
    }

    const result = migrate(config)
    assert.equal(Object.keys(result.customGlobals).length, 2)
    assert.equal(result.customGlobals.myCustomGlobal, 'writable')
    assert.equal(result.customGlobals.SOME_CONST, 'readonly')
  })

  it('warns about overrides that need manual migration', () => {
    const config = {
      overrides: [
        { files: ['*.test.js'], rules: { 'no-undef': 'off' } },
      ],
      rules: {},
    }

    const result = migrate(config)
    assert.ok(result.warnings.some(w => w.includes('overrides')))
  })

  it('warns about non-kaliber extends', () => {
    const config = {
      extends: ['@kaliber/eslint-plugin', 'eslint:recommended'],
      rules: {},
    }

    const result = migrate(config)
    assert.ok(result.warnings.some(w => w.includes('eslint:recommended')))
  })

  it('captures ignorePatterns', () => {
    const config = {
      ignorePatterns: ['dist/', 'build/'],
      rules: {},
    }

    const result = migrate(config)
    assert.deepEqual(result.ignorePatterns, ['dist/', 'build/'])
  })
})

describe('generateOutput', () => {
  it('generates minimal config when no overrides are needed', () => {
    const output = generateOutput({
      overrideRules: {},
      customGlobals: {},
      ignorePatterns: null,
    })

    assert.ok(output.includes("require('@kaliber/eslint-plugin/eslint.config')"))
    assert.ok(output.includes('...kaliberConfig'))
    assert.ok(!output.includes('rules:'))
  })

  it('includes override rules in the output', () => {
    const output = generateOutput({
      overrideRules: { 'no-console': 'off' },
      customGlobals: {},
      ignorePatterns: null,
    })

    assert.ok(output.includes("'no-console': 'off'"))
    assert.ok(output.includes('rules:'))
  })

  it('includes custom globals in the output', () => {
    const output = generateOutput({
      overrideRules: {},
      customGlobals: { myGlobal: 'readonly' },
      ignorePatterns: null,
    })

    assert.ok(output.includes("myGlobal: 'readonly'"))
    assert.ok(output.includes('languageOptions:'))
    assert.ok(output.includes('globals:'))
  })

  it('includes ignores block in the output', () => {
    const output = generateOutput({
      overrideRules: {},
      customGlobals: {},
      ignorePatterns: ['dist/', 'build/'],
    })

    assert.ok(output.includes("ignores: ['dist/', 'build/']"))
  })

  it('formats array rule values correctly', () => {
    const output = generateOutput({
      overrideRules: { 'no-unused-vars': ['warn', { args: 'none' }] },
      customGlobals: {},
      ignorePatterns: null,
    })

    assert.ok(output.includes("'no-unused-vars': ['warn', { args: 'none' }]"))
  })
})

describe('stripJsonComments', () => {
  it('strips single-line comments', () => {
    const input = '{\n  "a": 1, // comment\n  "b": 2\n}'
    const result = stripJsonComments(input)
    const parsed = JSON.parse(result)
    assert.deepEqual(parsed, { a: 1, b: 2 })
  })

  it('strips multi-line comments', () => {
    const input = '{\n  /* comment */\n  "a": 1\n}'
    const result = stripJsonComments(input)
    const parsed = JSON.parse(result)
    assert.deepEqual(parsed, { a: 1 })
  })
})
