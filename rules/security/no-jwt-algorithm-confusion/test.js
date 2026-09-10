const { test, merge } = require('../../../machinery/test')

const jwt = "const jwt = require('jsonwebtoken'); "
const jose = "import { jwtVerify } from 'jose'; "

test('security-no-jwt-algorithm-confusion', merge(
  {
    // --- the positive obligation -------------------------------------------
    valid: [
      // Explicit allowlist: the whole point.
      `${jwt}jwt.verify(token, key, { algorithms: ['RS256'] })`,
      `${jwt}jwt.verify(token, key, { algorithms: allowed })`,
      `${jose}export const payload = jwtVerify(token, key, { algorithms: ['ES256'] })`,
      // Both keys present: algorithms (the one that actually works) is
      // what matters, so the stray singular key is not itself a finding.
      `${jwt}jwt.verify(token, key, { algorithm: 'RS256', algorithms: ['RS256'] })`,

      // The callback form reads better with the options lifted out, and this
      // is a correctly pinned call. Reported until a dogfood run found it.
      `${jwt}const options = { ignoreExpiration: true, algorithms: ['RS256'] }; jwt.verify(token, key, options, (err, decoded) => decoded)`,
      `${jwt}const options = { algorithms: ['RS256'] }; jwt.verify(token, key, options)`,
    ],
    invalid: [
      {
        code: `${jwt}jwt.verify(token, key)`,
        errors: [{ messageId: 'missingAlgorithms' }],
      },
      {
        code: "const jsonwebtoken = require('jsonwebtoken'); jsonwebtoken.verify(token, publicKey)",
        errors: [{ messageId: 'missingAlgorithms' }],
      },
      {
        code: `${jose}export const payload = jwtVerify(token, secretKey)`,
        errors: [{ messageId: 'missingAlgorithms' }],
      },
      {
        code: "import { verify } from 'jsonwebtoken'; export function check(token) { return verify(token, key) }",
        errors: [{ messageId: 'missingAlgorithms' }],
      },
      {
        // Renamed import: the export's own name is what the rule matches.
        code: "import { verify as checkToken } from 'jsonwebtoken'; export function check(token) { return checkToken(token, key) }",
        errors: [{ messageId: 'missingAlgorithms' }],
      },
      {
        code: "import * as jwt from 'jsonwebtoken'; export function check(token) { return jwt.verify(token, key) }",
        errors: [{ messageId: 'missingAlgorithms' }],
      },
      {
        code: "const { verify } = require('jsonwebtoken'); function check(token) { return verify(token, key) }",
        errors: [{ messageId: 'missingAlgorithms' }],
      },
      {
        code: "const checkToken = require('jsonwebtoken').verify; function check(token) { return checkToken(token, key) }",
        errors: [{ messageId: 'missingAlgorithms' }],
      },
      {
        // Callback-only form still passes no options.
        code: `${jwt}jwt.verify(token, key, function callback(err, decoded) {})`,
        errors: [{ messageId: 'missingAlgorithms' }],
      },
      {
        // Options present but algorithms explicitly absent from it.
        code: `${jwt}jwt.verify(token, key, { ignoreExpiration: true })`,
        errors: [{ messageId: 'missingAlgorithms' }],
      },
      {
        // An empty options object is the same omission with extra steps.
        code: `${jwt}jwt.verify(token, key, {})`,
        errors: [{ messageId: 'missingAlgorithms' }],
      },
      {
        // `algorithm` (singular) is sign()'s option, silently ignored by
        // verify() — the exact real-world typo this message exists to name.
        code: `${jwt}jwt.verify(token, key, { ignoreExpiration: true, algorithm: ['RS256'] })`,
        errors: [{ messageId: 'singularAlgorithmTypo' }],
      },
      {
        code: `${jwt}jwt.verify(token, key, { algorithm: 'RS256' })`,
        errors: [{ messageId: 'singularAlgorithmTypo' }],
      },
    ],
  },

  {
    // --- what stays quiet, and why ------------------------------------------
    valid: [
      // A local verify() that does not come from a JWT module must not be
      // flagged — bare-name matching without provenance would fire on every
      // custom validator in every codebase.
      'function verify(signature, expected) { return signature === expected }; verify(sig, expected)',
      'const jwt = { verify(token, key) { return decode(token) } }; jwt.verify(token, key)',
      "const jwt = require('./our-jwt-wrapper'); jwt.verify(token, key)",
      // Not a JWT module.
      "const crypto = require('crypto'); crypto.verify(algorithm, key, data)",
      // Nothing in the file says where this came from. A miss, not a guess.
      'jwt.verify(token, key)',
    ],
    invalid: [
      {
        // Options built elsewhere: the rule cannot confirm they contain an
        // algorithms list, so this is flagged by design rather than trusted.
        code: `${jwt}jwt.verify(token, key, config.jwtOptions)`,
        errors: [{ messageId: 'missingAlgorithms' }],
      },
      {
        // A local options object that genuinely pins nothing is still a
        // finding — resolving the binding is not the same as trusting it.
        code: `${jwt}const options = { ignoreExpiration: true }; jwt.verify(token, key, options, cb)`,
        errors: [{ messageId: 'missingAlgorithms' }],
      },
      {
        code: `${jwt}const options = { algorithm: 'RS256' }; jwt.verify(token, key, options)`,
        errors: [{ messageId: 'singularAlgorithmTypo' }],
      },
    ],
  },
))
