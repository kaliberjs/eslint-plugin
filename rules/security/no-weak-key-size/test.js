const { test, merge } = require('../../../machinery/test')

test('security-no-weak-key-size', merge(
  {
    // --- RSA / RSA-PSS / DSA modulus length ---------------------------------
    valid: [
      "crypto.generateKeyPairSync('rsa', { modulusLength: 2048 })",
      "crypto.generateKeyPairSync('rsa', { modulusLength: 4096 })",
      "crypto.generateKeyPairSync('rsa-pss', { modulusLength: 3072 })",
      "crypto.generateKeyPairSync('dsa', { modulusLength: 2048, divisorLength: 256 })",
      // Not a literal: a documented miss, and deliberately silent.
      "crypto.generateKeyPairSync('rsa', { modulusLength: config.keySize })",
      // No modulusLength at all — node throws; not our finding to make.
      "crypto.generateKeyPairSync('rsa', {})",
    ],
    invalid: [
      {
        code: "crypto.generateKeyPairSync('rsa', { modulusLength: 1024 })",
        errors: [{ messageId: 'weakModulusLength' }],
      },
      {
        code: "crypto.generateKeyPairSync('rsa', { modulusLength: 512 })",
        errors: [{ messageId: 'weakModulusLength' }],
      },
      {
        code: "crypto.generateKeyPairSync('rsa-pss', { modulusLength: 1024 })",
        errors: [{ messageId: 'weakModulusLength' }],
      },
      {
        code: "crypto.generateKeyPairSync('dsa', { modulusLength: 1024, divisorLength: 160 })",
        errors: [{ messageId: 'weakModulusLength' }],
      },
      {
        // 2047 is below the floor; the comparison is not a power-of-two check.
        code: "crypto.generateKeyPairSync('rsa', { modulusLength: 2047 })",
        errors: [{ messageId: 'weakModulusLength' }],
      },
    ],
  },

  {
    // --- named curves -------------------------------------------------------
    valid: [
      "crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' })",
      "crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' })",
      "crypto.generateKeyPairSync('ec', { namedCurve: 'secp384r1' })",
      "crypto.generateKeyPairSync('ec', { namedCurve: 'P-384' })",
      "crypto.generateKeyPairSync('ec', { namedCurve: 'secp521r1' })",
      "crypto.generateKeyPairSync('ec', { namedCurve: 'P-521' })",
      // Non-standard but adequately sized: strength is the weakness, not fashion.
      "crypto.generateKeyPairSync('ec', { namedCurve: 'secp256k1' })",
      "crypto.generateKeyPairSync('ec', { namedCurve: 'brainpoolP256r1' })",
      // 224 is exactly the floor.
      "crypto.generateKeyPairSync('ec', { namedCurve: 'secp224r1' })",
      // A modulusLength on an ec key is meaningless and not read.
      "crypto.generateKeyPairSync('ec', { namedCurve: 'P-256', modulusLength: 256 })",
    ],
    invalid: [
      {
        code: "crypto.generateKeyPairSync('ec', { namedCurve: 'secp112r1' })",
        errors: [{ messageId: 'weakNamedCurve' }],
      },
      {
        code: "crypto.generateKeyPairSync('ec', { namedCurve: 'secp128r1' })",
        errors: [{ messageId: 'weakNamedCurve' }],
      },
      {
        code: "crypto.generateKeyPairSync('ec', { namedCurve: 'secp160k1' })",
        errors: [{ messageId: 'weakNamedCurve' }],
      },
      {
        code: "crypto.generateKeyPairSync('ec', { namedCurve: 'secp160r2' })",
        errors: [{ messageId: 'weakNamedCurve' }],
      },
      {
        code: "crypto.generateKeyPairSync('ec', { namedCurve: 'prime192v1' })",
        errors: [{ messageId: 'weakNamedCurve' }],
      },
      {
        code: "crypto.generateKeyPairSync('ec', { namedCurve: 'sect163k1' })",
        errors: [{ messageId: 'weakNamedCurve' }],
      },
      {
        code: "crypto.generateKeyPairSync('ec', { namedCurve: 'brainpoolP160r1' })",
        errors: [{ messageId: 'weakNamedCurve' }],
      },
    ],
  },

  {
    // --- the sizeless key types are never a finding -------------------------
    valid: [
      "crypto.generateKeyPairSync('ed25519')",
      "crypto.generateKeyPairSync('x25519')",
      "crypto.generateKeyPairSync('ed448')",
      "crypto.generateKeyPairSync('x448')",
      "crypto.generateKeyPair('ed25519', {}, (err, publicKey, privateKey) => {})",
      // ed25519 is a 255-bit curve; nothing in the name is below the floor,
      // and the type is not 'ec' so namedCurve is not consulted either.
      "crypto.generateKeyPairSync('ed25519', { publicKeyEncoding: { type: 'spki', format: 'pem' } })",
    ],
    invalid: [],
  },

  {
    // --- createDiffieHellman ------------------------------------------------
    valid: [
      'crypto.createDiffieHellman(2048)',
      'crypto.createDiffieHellman(4096, 2)',
      // Loading an existing prime, not generating one.
      "crypto.createDiffieHellman(primeBuffer, 'hex')",
      "crypto.createDiffieHellman('some-encoded-prime', 'base64')",
    ],
    invalid: [
      {
        code: 'crypto.createDiffieHellman(512)',
        errors: [{ messageId: 'weakDiffieHellmanPrime' }],
      },
      {
        code: 'crypto.createDiffieHellman(1024, 2)',
        errors: [{ messageId: 'weakDiffieHellmanPrime' }],
      },
    ],
  },

  {
    // --- binding forms ------------------------------------------------------
    valid: [
      "const { generateKeyPairSync } = require('crypto'); generateKeyPairSync('rsa', { modulusLength: 3072 })",
      "import { generateKeyPairSync } from 'node:crypto'; generateKeyPairSync('rsa', { modulusLength: 2048 })",

      // Same method name, different library. `generateKeyPair` belongs to
      // every KMS client and wallet SDK there is, so the module has to be
      // proven before a key size means anything.
      "const kms = require('./our-kms-client'); kms.generateKeyPairSync('rsa', { modulusLength: 1024 })",
      "import { generateKeyPairSync } from 'some-wallet-sdk'; generateKeyPairSync('rsa', { modulusLength: 1024 })",
      'const helpers = { generateKeyPairSync(type, options) { return null } }; helpers.generateKeyPairSync(\'rsa\', { modulusLength: 1024 })',
      'function createDiffieHellman(bits) { return bits }; createDiffieHellman(1024)',
      // A shadowing local `crypto` is not node:crypto.
      "const crypto = require('./crypto-helpers'); crypto.generateKeyPairSync('rsa', { modulusLength: 1024 })",
    ],
    invalid: [
      {
        code: "const { generateKeyPairSync } = require('crypto'); generateKeyPairSync('rsa', { modulusLength: 1024 })",
        errors: [{ messageId: 'weakModulusLength' }],
      },
      {
        code: "const { createDiffieHellman } = require('node:crypto'); createDiffieHellman(1024)",
        errors: [{ messageId: 'weakDiffieHellmanPrime' }],
      },
      {
        code: "import { generateKeyPairSync } from 'node:crypto'; generateKeyPairSync('rsa', { modulusLength: 1024 })",
        errors: [{ messageId: 'weakModulusLength' }],
      },
      {
        code: "import crypto from 'crypto'; crypto.generateKeyPairSync('ec', { namedCurve: 'secp112r1' })",
        errors: [{ messageId: 'weakNamedCurve' }],
      },
      {
        code: "const crypto = require('node:crypto'); crypto.generateKeyPairSync('rsa', { modulusLength: 1024 })",
        errors: [{ messageId: 'weakModulusLength' }],
      },
      {
        code: "require('crypto').generateKeyPairSync('rsa', { modulusLength: 1024 })",
        errors: [{ messageId: 'weakModulusLength' }],
      },
      {
        // The async callback form takes the same (type, options) pair.
        code: "crypto.generateKeyPair('rsa', { modulusLength: 1024 }, (err, publicKey, privateKey) => {})",
        errors: [{ messageId: 'weakModulusLength' }],
      },
      {
        code: "import { generateKeyPair } from 'crypto'; generateKeyPair('ec', { namedCurve: 'secp160k1' }, cb)",
        errors: [{ messageId: 'weakNamedCurve' }],
      },
      {
        // Renamed on the way in: the export's own name is what is matched.
        code: "import { generateKeyPairSync as makeKeys } from 'node:crypto'; export const keys = makeKeys('rsa', { modulusLength: 1024 })",
        errors: [{ messageId: 'weakModulusLength' }],
      },
      {
        code: "const { generateKeyPairSync: makeKeys } = require('crypto'); makeKeys('rsa', { modulusLength: 1024 })",
        errors: [{ messageId: 'weakModulusLength' }],
      },
      {
        code: "import * as crypto from 'node:crypto'; export const keys = crypto.generateKeyPairSync('rsa', { modulusLength: 1024 })",
        errors: [{ messageId: 'weakModulusLength' }],
      },
    ],
  },
))
