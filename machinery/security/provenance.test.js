const test = require('node:test')
const assert = require('node:assert')
const { Linter } = require('eslint')
const { apiProvenance } = require('./provenance')

const cases = [
  ["import { createHash } from 'node:crypto'; createHash('md5')", 'crypto:createHash'],
  ["import { createHash as h } from 'crypto'; h('md5')", 'crypto:createHash'],
  ["import crypto from 'crypto'; crypto.createHash('md5')", 'crypto:createHash'],
  ["import * as crypto from 'node:crypto'; crypto.createHash('md5')", 'crypto:createHash'],
  ["const { createHash } = require('crypto'); createHash('md5')", 'crypto:createHash'],
  ["const { createHash: h } = require('node:crypto'); h('md5')", 'crypto:createHash'],
  ["const h = require('crypto').createHash; h('md5')", 'crypto:createHash'],
  ["const crypto = require('node:crypto'); crypto.createHash('md5')", 'crypto:createHash'],
  ["require('crypto').createHash('md5')", 'crypto:createHash'],
  ["const crypto = require('crypto'); crypto['createHash']('md5')", 'crypto:createHash'],

  ['function createHash() {} createHash("md5")', null],
  ['const local = { createHash() {} }; local.createHash("md5")', null],
  ["import { createHash } from './crypto'; createHash('md5')", './crypto:createHash'],
  ['createHash("md5")', null],
  ["import { createHash } from 'crypto'; createHash.call(null, 'md5')", null],
]

test('apiProvenance resolves every import and require shape', () => {
  for (const [code, expected] of cases) {
    assert.strictEqual(provenanceOfLastCall(code), expected, code)
  }
})

// `import { createHash } from 'crypto'` binds the export, not the module.
// `createHash.update(...)` is a property of that function, and answering
// `crypto.update` would invent an export node:crypto does not have.
test('a named import is not treated as the module object', () => {
  assert.strictEqual(
    provenanceOfLastCall("import { createHash } from 'crypto'; createHash.update('x')"),
    null
  )
})

function provenanceOfLastCall(code) {
  let result
  const linter = new Linter()

  linter.verify(code, {
    plugins: {
      probe: {
        rules: {
          collect: {
            create: context => ({
              CallExpression(node) {
                // The `require(...)` in the fixture's own setup is not what
                // is under test; every fixture ends in the call that is.
                if (node.callee.type === 'Identifier' && node.callee.name === 'require') return

                const origin = apiProvenance(context.sourceCode, node.callee)
                result = origin && `${origin.module}:${origin.name}`
              },
            }),
          },
        },
      },
    },
    languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
    rules: { 'probe/collect': 'error' },
  })

  return result ?? null
}
