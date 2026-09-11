const { test, merge } = require('../../../machinery/test')

/**
 * False-positive corpus for no-weak-key-size: legitimate crypto code, and
 * code that merely looks like it, all of which must stay quiet.
 */
test('security-no-weak-key-size', merge(
  {
    // --- not key generation -------------------------------------------------
    valid: [
      // Importing or parsing an existing key. Never generation, whatever
      // size the key turns out to be.
      "crypto.createPublicKey({ key: pem, format: 'pem' })",
      "crypto.createPrivateKey({ key: pem, format: 'pem', passphrase: secret })",
      "crypto.createPublicKey(fs.readFileSync('legacy-1024.pub'))",
      "const key = crypto.createPrivateKey({ key: der, format: 'der', type: 'pkcs8' })",

      // Verification, signing, key agreement with an already-existing key.
      "crypto.createVerify('sha256').verify(publicKey, signature)",
      "crypto.createSign('sha256').sign(privateKey)",
      'crypto.publicEncrypt({ key, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING }, data)',
      'crypto.diffieHellman({ privateKey, publicKey })',

      // A DH group loaded by name or from an existing prime, not generated.
      "crypto.getDiffieHellman('modp14')",
      'crypto.createDiffieHellman(existingPrime, existingGenerator)',

      // Symmetric key material — a different rule's territory, and 256 bits
      // of AES key is not a 256-bit modulus.
      'crypto.randomBytes(16)',
      "crypto.generateKeySync('aes', { length: 256 })",
      'crypto.scryptSync(password, salt, 32)',
      "crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512')",
    ],
    invalid: [],
  },

  {
    // --- same name, different thing -----------------------------------------
    valid: [
      // A KMS/HSM client, a wallet, a test double: `generateKeyPair` is a
      // perfectly ordinary method name and none of these are node:crypto.
      'kms.generateKeyPair({ modulusLength: 1024 })',
      "wallet.generateKeyPair('rsa', { modulusLength: 512 })",
      "this.keyService.generateKeyPair('rsa', { modulusLength: 512 })",
      "async function make() { return client.generateKeyPair({ KeySpec: 'RSA_2048' }) }",
      "const { generateKeyPair } = require('./key-service'); generateKeyPair('rsa', { modulusLength: 512 })",
      "import { generateKeyPair } from '@myorg/keys'; generateKeyPair('rsa', { modulusLength: 512 })",
      "function generateKeyPair(type, options) { return backend.create(type, options) } generateKeyPair('rsa', { modulusLength: 512 })",

      // Unimported bare call: no provenance, no finding.
      "generateKeyPairSync('rsa', { modulusLength: 512 })",
      'createDiffieHellman(512)',

      // A `crypto` that is demonstrably not node:crypto.
      "import crypto from 'crypto-browserify-shim'; crypto.generateKeyPairSync('rsa', { modulusLength: 512 })",
      "const crypto = require('./fixtures/fake-crypto'); crypto.createDiffieHellman(512)",
    ],
    invalid: [],
  },

  {
    // --- adequate configurations, spelled every plausible way ---------------
    valid: [
      "crypto.generateKeyPairSync('rsa', { modulusLength: 2048, publicExponent: 0x10001 })",
      "crypto.generateKeyPairSync('rsa', { modulusLength: 4096, publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem', cipher: 'aes-256-cbc', passphrase: pass } })",
      "crypto.generateKeyPair('rsa', { modulusLength: 3072 }, (err, pub, priv) => {})",
      "crypto.generateKeyPairSync('ed25519', { privateKeyEncoding: { type: 'pkcs8', format: 'pem' } })",
      "crypto.generateKeyPairSync('x25519')",
      'crypto.createDiffieHellman(2048, 2)',

      // Numbers near the sink that are not key sizes.
      "crypto.generateKeyPairSync('rsa', { modulusLength: 2048, publicExponent: 3 })",
      "crypto.generateKeyPairSync('ec', { namedCurve: 'P-256', publicKeyEncoding: { type: 'spki', format: 'pem' } })",

      // publicExponent is a small number by design; it is not read.
      "crypto.generateKeyPairSync('rsa', { publicExponent: 65537, modulusLength: 2048 })",
    ],
    invalid: [],
  },

  {
    // --- intent the rule refuses to infer -----------------------------------
    // A small key in a test fixture or for a constrained device is reported
    // exactly like any other. The rule reports the fact, not a judgement:
    // "is this file a test" is not statically knowable and guessing at it
    // is how a security rule loses a developer's trust in both directions.
    valid: [],
    invalid: [
      {
        filename: 'src/keys.test.js',
        code: "crypto.generateKeyPairSync('rsa', { modulusLength: 512 })",
        errors: [{ messageId: 'weakModulusLength' }],
      },
    ],
  },
))
