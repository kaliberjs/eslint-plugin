const { test } = require('../../machinery/test')

test('security-no-weak-crypto', {
  valid: [
    // Safe hash algorithms
    `crypto.createHash('sha256')`,
    `crypto.createHash('sha384')`,
    `crypto.createHash('sha512')`,
    `crypto.createHash('sha3-256')`,

    // require of safe packages
    `require('crypto')`,
    `require('bcrypt')`,
    `require('argon2')`,
    `require('scrypt')`,

    // import of safe packages
    `import crypto from 'crypto'`,
    `import bcrypt from 'bcrypt'`,
    `import argon2 from 'argon2'`,

    // Non-createHash method calls
    `crypto.createHmac('sha256', key)`,
    `crypto.randomBytes(32)`,
    `crypto.createCipher('aes-256-cbc', key)`,

    // createHash with no arguments
    `crypto.createHash()`,

    // createHash with non-string argument (variable)
    `crypto.createHash(algorithm)`,

    // createHash with non-string argument (number)
    `crypto.createHash(5)`,

    // Not a MemberExpression callee
    `createHash('md5')`,

    // Different method name
    `crypto.hash('md5')`,

    // require with non-matching package
    `require('md5-hash')`,
    `require('sha1-digest')`,

    // import of non-matching package
    `import md5Hash from 'md5-hash'`,

    // Named import from crypto (import declaration, but source is not in WEAK_PACKAGES)
    `import { createHash } from 'crypto'`,
  ],
  invalid: [
    // createHash with md5
    {
      code: `crypto.createHash('md5')`,
      errors: [{ messageId: 'weakCrypto' }],
    },
    // createHash with sha1
    {
      code: `crypto.createHash('sha1')`,
      errors: [{ messageId: 'weakCrypto' }],
    },
    // createHash with md4
    {
      code: `crypto.createHash('md4')`,
      errors: [{ messageId: 'weakCrypto' }],
    },
    // createHash with ripemd160
    {
      code: `crypto.createHash('ripemd160')`,
      errors: [{ messageId: 'weakCrypto' }],
    },
    // Case insensitive: MD5 (toLowerCase check)
    {
      code: `crypto.createHash('MD5')`,
      errors: [{ messageId: 'weakCrypto' }],
    },
    // Case insensitive: SHA1
    {
      code: `crypto.createHash('SHA1')`,
      errors: [{ messageId: 'weakCrypto' }],
    },
    // createHash on different object name
    {
      code: `myLib.createHash('md5')`,
      errors: [{ messageId: 'weakCrypto' }],
    },
    // createHash chained
    {
      code: `require('crypto').createHash('md5')`,
      errors: [{ messageId: 'weakCrypto' }],
    },
    // require('md5')
    {
      code: `const md5 = require('md5')`,
      errors: [{ messageId: 'weakCryptoPackage' }],
    },
    // require('sha1')
    {
      code: `const sha1 = require('sha1')`,
      errors: [{ messageId: 'weakCryptoPackage' }],
    },
    // require('md4')
    {
      code: `const md4 = require('md4')`,
      errors: [{ messageId: 'weakCryptoPackage' }],
    },
    // import md5
    {
      code: `import md5 from 'md5'`,
      errors: [{ messageId: 'weakCryptoPackage' }],
    },
    // import sha1
    {
      code: `import sha1 from 'sha1'`,
      errors: [{ messageId: 'weakCryptoPackage' }],
    },
    // import md4
    {
      code: `import md4 from 'md4'`,
      errors: [{ messageId: 'weakCryptoPackage' }],
    },
    // import with alias
    {
      code: `import hash from 'md5'`,
      errors: [{ messageId: 'weakCryptoPackage' }],
    },
    // Realistic: hash a password with md5
    {
      code: `const hash = crypto.createHash('md5').update(password).digest('hex')`,
      errors: [{ messageId: 'weakCrypto' }],
    },
    // Realistic: hash with sha1
    {
      code: `const hash = crypto.createHash('sha1').update(data).digest('hex')`,
      errors: [{ messageId: 'weakCrypto' }],
    },
    // Both require and createHash weak in same code
    {
      code: `const md5 = require('md5')\nconst h = crypto.createHash('sha1')`,
      errors: [
        { messageId: 'weakCryptoPackage' },
        { messageId: 'weakCrypto' },
      ],
    },
  ],
})
