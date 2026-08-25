const { test, merge } = require('../../../machinery/test')

/**
 * Adversarial corpus for no-weak-key-size.
 *
 * Two misses found and fixed here, both in the callee matcher rather than
 * the size comparison:
 *
 * - `const { generateKeyPairSync: gen } = require('crypto')` matched on the
 *   *local* name and so did not match at all. The binding already has to be
 *   resolved for the provenance check, so reading the imported name off it
 *   is free. Same for `import { generateKeyPairSync as gen }`.
 * - `crypto['generateKeyPairSync'](...)` — a computed member callee was
 *   dropped by the non-computed-only property read.
 *
 * The remaining evasions below are accepted misses, and match the posture of
 * every other matcher-shaped rule in this codebase (no-des-3des, no-md5,
 * no-jwt-algorithm-confusion): the rule reads the direct call site and does
 * not attempt interprocedural tracing. This rule has no taint flow to attack.
 */
test('security-no-weak-key-size', merge(
  {
    // --- evasions that are now caught ---------------------------------------
    valid: [],
    invalid: [
      {
        code: "const { generateKeyPairSync: gen } = require('crypto'); gen('rsa', { modulusLength: 512 })",
        errors: [{ messageId: 'weakModulusLength' }],
      },
      {
        code: "import { generateKeyPairSync as gen } from 'node:crypto'; gen('rsa', { modulusLength: 1024 })",
        errors: [{ messageId: 'weakModulusLength' }],
      },
      {
        code: "import { createDiffieHellman as dh } from 'crypto'; dh(512)",
        errors: [{ messageId: 'weakDiffieHellmanPrime' }],
      },
      {
        code: "import c from 'node:crypto'; c.generateKeyPairSync('rsa', { modulusLength: 1024 })",
        errors: [{ messageId: 'weakModulusLength' }],
      },
      {
        code: "const nodeCrypto = require('crypto'); nodeCrypto.generateKeyPairSync('ec', { namedCurve: 'secp112r1' })",
        errors: [{ messageId: 'weakNamedCurve' }],
      },
      {
        code: "crypto['generateKeyPairSync']('rsa', { modulusLength: 1024 })",
        errors: [{ messageId: 'weakModulusLength' }],
      },
      {
        // Computed literal option key.
        code: "crypto.generateKeyPairSync('rsa', { ['modulusLength']: 1024 })",
        errors: [{ messageId: 'weakModulusLength' }],
      },
      {
        code: "crypto.generateKeyPairSync('rsa', { 'modulusLength': 1024 })",
        errors: [{ messageId: 'weakModulusLength' }],
      },
      {
        // Not a bare literal, but still statically knowable — getStaticValue
        // resolves a const and folds arithmetic.
        code: "const BITS = 1024; crypto.generateKeyPairSync('rsa', { modulusLength: BITS })",
        errors: [{ messageId: 'weakModulusLength' }],
      },
      {
        code: "crypto.generateKeyPairSync('rsa', { modulusLength: 512 * 2 })",
        errors: [{ messageId: 'weakModulusLength' }],
      },
      {
        code: "crypto.generateKeyPairSync('rsa', { modulusLength: 0x400 })",
        errors: [{ messageId: 'weakModulusLength' }],
      },
      {
        // The key type itself hidden behind a constant.
        code: "const TYPE = 'rsa'; crypto.generateKeyPairSync(TYPE, { modulusLength: 1024 })",
        errors: [{ messageId: 'weakModulusLength' }],
      },
      {
        code: "crypto.generateKeyPairSync('ec', { namedCurve: `secp112r1` })",
        errors: [{ messageId: 'weakNamedCurve' }],
      },
      {
        // A spread before the weak literal does not hide it.
        code: "crypto.generateKeyPairSync('rsa', { ...defaults, modulusLength: 1024 })",
        errors: [{ messageId: 'weakModulusLength' }],
      },
    ],
  },

  {
    // --- accepted misses, asserted so a future change has to notice ---------
    valid: [
      // The options object held in a variable. Deliberately not traced: the
      // rule reads literals at the call site, nothing else.
      "const options = { modulusLength: 1024 }; crypto.generateKeyPairSync('rsa', options)",

      // Same-file helper wrapping the call. Matcher-shaped rules in this
      // codebase do not do interprocedural analysis; the taint engine exists
      // for flows, and key size is not a flow.
      "function makeKey(bits) { return crypto.generateKeyPairSync('rsa', { modulusLength: bits }) } makeKey(512)",

      // Key size from config — the inventory's own documented false negative.
      "crypto.generateKeyPairSync('rsa', { modulusLength: config.keySize })",
      "crypto.generateKeyPairSync('rsa', { modulusLength: Number(process.env.RSA_BITS) })",

      // A curve name assembled at runtime.
      "crypto.generateKeyPairSync('ec', { namedCurve: `secp${size}r1` })",

      // Re-export: the call is in another file, which this rule never opens.
      "export { generateKeyPairSync } from 'crypto'",

      // A binding of the right shape from the wrong module.
      "const { generateKeyPairSync } = require('./our-crypto'); generateKeyPairSync('rsa', { modulusLength: 1024 })",

      // Shadowed local named crypto — provenance resolves it and finds no
      // crypto module, so the name alone does not carry it.
      "const crypto = require('./test-helpers'); crypto.generateKeyPairSync('rsa', { modulusLength: 512 })",
      "function build(crypto) { return crypto.generateKeyPairSync('rsa', { modulusLength: 512 }) }",
    ],
    invalid: [],
  },
))
