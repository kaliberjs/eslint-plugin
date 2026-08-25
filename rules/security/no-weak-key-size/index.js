const { findVariable, getStaticValue } = require('@eslint-community/eslint-utils')
const { getStaticPropertyName } = require('../../../machinery/ast')
const docsUrl = require('../../../machinery/docsUrl')
const { report } = require('../../../machinery/security/finding')

// Key size is a literal at the generation call site, so this is a numeric
// comparison, not a taint problem. NIST SP 800-57 Part 1 Rev. 5 retired
// RSA/DSA/DH below 2048 bits and elliptic curves below 224 bits at the end
// of 2013; 2048 is the floor, 3072 is the recommendation for new keys.

const MIN_MODULUS_BITS = 2048
const MIN_CURVE_BITS = 224

// `crypto` and `node:crypto` only. A project-local module bound to the name
// `crypto` is not this.
const CRYPTO_MODULE = /^(node:)?crypto$/

// generateKeyPair's `type` argument. The ed/x families take no size
// parameter at all — there is nothing to get wrong, so they never match.
const MODULUS_TYPES = new Set(['rsa', 'rsa-pss', 'dsa'])

const GENERATORS = new Set(['generateKeyPair', 'generateKeyPairSync', 'createDiffieHellman'])

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Do not generate asymmetric keys below the recommended size (CWE-326)',
      url: docsUrl(__dirname),
    },
    messages: {
      weakModulusLength: [
        'Generating a {{ type }} key with modulusLength {{ bits }}.',
        `Below ${MIN_MODULUS_BITS} bits is inadequate (NIST SP 800-57 retired it in 2013).`,
        'Use 2048 at minimum, 3072 or more for a key generated today.',
      ].join(' '),
      weakNamedCurve: [
        "The named curve '{{ curve }}' is a {{ bits }}-bit curve.",
        `Elliptic curves below ${MIN_CURVE_BITS} bits are inadequate (NIST SP 800-57).`,
        "Use 'prime256v1' (P-256), 'secp384r1' or 'secp521r1', or generate an 'ed25519' key instead.",
      ].join(' '),
      weakDiffieHellmanPrime: [
        'createDiffieHellman generates a {{ bits }}-bit prime.',
        `Below ${MIN_MODULUS_BITS} bits is inadequate, and 1024-bit groups are precomputation-attackable (Logjam).`,
        "Pass 2048 or more, or use crypto.createECDH('prime256v1').",
      ].join(' '),
    },
    // No fix: raising the key size changes what the key is compatible with
    // and how long generation takes. That is the developer's call.
    schema: [],
  },

  create(context) {
    return {
      CallExpression(node) {
        const name = calleeName(context, node.callee)
        if (!GENERATORS.has(name)) return
        if (!isCryptoCallee(context, node.callee)) return

        if (name === 'createDiffieHellman') checkDiffieHellman(context, node)
        else checkKeyPair(context, node)
      },
    }
  },
}

/** generateKeyPair(type, options[, callback]) */
function checkKeyPair(context, node) {
  const type = staticValueOf(context, node.arguments[0])
  if (typeof type !== 'string') return

  // Only an object literal is readable here. `{ modulusLength: config.bits }`
  // or an options object held in a variable is a documented miss.
  const options = node.arguments[1]
  if (options?.type !== 'ObjectExpression') return

  if (MODULUS_TYPES.has(type)) {
    const property = findProperty(options, 'modulusLength')
    const bits = staticValueOf(context, property?.value)
    if (typeof bits !== 'number' || bits >= MIN_MODULUS_BITS) return

    report(context, {
      node: property,
      messageId: 'weakModulusLength',
      data: { type, bits },
      severity: 'medium',
      confidence: 1,
    })
  }

  if (type === 'ec') {
    const property = findProperty(options, 'namedCurve')
    const curve = staticValueOf(context, property?.value)
    if (typeof curve !== 'string') return

    const bits = curveBits(curve)
    if (bits === null || bits >= MIN_CURVE_BITS) return

    report(context, {
      node: property,
      messageId: 'weakNamedCurve',
      data: { curve, bits },
      severity: 'medium',
      confidence: 1,
    })
  }
}

/**
 * createDiffieHellman(primeLength[, generator]) generates a new prime;
 * createDiffieHellman(prime, ...) loads an existing one from a Buffer or an
 * encoded string. Only the numeric first argument is key generation.
 */
function checkDiffieHellman(context, node) {
  const bits = staticValueOf(context, node.arguments[0])
  if (typeof bits !== 'number' || bits >= MIN_MODULUS_BITS) return

  report(context, {
    node: node.arguments[0],
    messageId: 'weakDiffieHellmanPrime',
    data: { bits },
    severity: 'medium',
    confidence: 1,
  })
}

/**
 * Every curve name in OpenSSL's list carries its field size as the only
 * three-digit run in the name: secp112r1, sect163k1, prime256v1, P-521,
 * brainpoolP384r1. A name we cannot read a size from is left alone rather
 * than guessed at — and so is a non-standard curve of adequate size
 * (secp256k1, brainpoolP256r1). CWE-326 is about strength, not fashion.
 */
function curveBits(curve) {
  const match = /\d{3}/.exec(curve)
  return match ? Number(match[0]) : null
}

function findProperty(objectExpression, name) {
  return objectExpression.properties.find(
    property => property.type === 'Property' && getStaticPropertyName(property) === name
  ) ?? null
}

function staticValueOf(context, node) {
  if (!node) return undefined
  return getStaticValue(node, context.sourceCode.getScope(node))?.value
}

/**
 * The node:crypto function being called, seen through a rename. A local
 * alias (`const { generateKeyPairSync: gen } = require('crypto')`) is the
 * cheapest possible evasion of a name matcher, and the binding already has
 * to be resolved for the provenance check, so the imported name is free.
 */
function calleeName(context, callee) {
  if (callee.type === 'MemberExpression') {
    if (!callee.computed) return callee.property?.name
    // crypto['generateKeyPairSync'](...)
    return callee.property?.type === 'Literal' ? String(callee.property.value) : null
  }

  if (callee.type !== 'Identifier') return null

  const definition = findVariable(context.sourceCode.getScope(callee), callee)?.defs[0]

  // import { generateKeyPairSync as gen } from 'crypto'
  if (definition?.node?.type === 'ImportSpecifier') return definition.node.imported?.name ?? callee.name

  // const { generateKeyPairSync: gen } = require('crypto')
  if (definition?.type === 'Variable' && definition.node.id?.type === 'ObjectPattern') {
    const property = definition.node.id.properties.find(
      it => it.type === 'Property' && it.value === definition.name
    )
    if (property) return getStaticPropertyName(property)
  }

  return callee.name
}

/**
 * Provenance, in the same spirit as no-jwt-algorithm-confusion's
 * isFromJwtModule: `generateKeyPair` is a plausible method name on an
 * unrelated object (a KMS client, a test helper, a wallet library), so the
 * callee must be provably node:crypto before anything is reported.
 */
function isCryptoCallee(context, callee) {
  if (callee.type === 'Identifier') return isCryptoBinding(context, callee)

  if (callee.type !== 'MemberExpression') return false
  const object = callee.object

  // require('node:crypto').generateKeyPairSync(...)
  if (object.type === 'CallExpression') return isCryptoRequire(object)

  if (object.type !== 'Identifier') return false
  if (isCryptoBinding(context, object)) return true

  // No binding in this file: `crypto.generateKeyPairSync` is node:crypto by
  // elimination — the webcrypto global has no such method, it has
  // crypto.subtle.generateKey.
  return !findVariable(context.sourceCode.getScope(object), object)?.defs.length
    && object.name === 'crypto'
}

function isCryptoBinding(context, identifier) {
  const definition = findVariable(context.sourceCode.getScope(identifier), identifier)?.defs[0]
  if (!definition) return false

  // import crypto from 'crypto' / import { generateKeyPairSync } from 'node:crypto'
  if (definition.type === 'ImportBinding') return CRYPTO_MODULE.test(String(definition.parent.source.value))

  // const crypto = require('crypto') / const { generateKeyPairSync } = require('crypto')
  if (definition.type === 'Variable') return isCryptoRequire(definition.node.init)

  return false
}

function isCryptoRequire(node) {
  return node?.type === 'CallExpression'
    && node.callee?.type === 'Identifier'
    && node.callee.name === 'require'
    && node.arguments[0]?.type === 'Literal'
    && CRYPTO_MODULE.test(String(node.arguments[0].value))
}
