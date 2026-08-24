const { test, merge } = require('../../../machinery/test')

test('security-no-disabled-tls-verification', merge(
  {
    // --- rejectUnauthorized / strictSSL across the common clients ---------
    invalid: [
      {
        code: 'https.request(url, { rejectUnauthorized: false })',
        errors: [{ messageId: 'verificationDisabled' }],
      },
      {
        code: 'new https.Agent({ rejectUnauthorized: false })',
        errors: [{ messageId: 'verificationDisabled' }],
      },
      {
        code: 'axios.get(url, { httpsAgent: new https.Agent({ rejectUnauthorized: false }) })',
        errors: [{ messageId: 'verificationDisabled' }],
      },
      {
        code: 'request(url, { strictSSL: false })',
        errors: [{ messageId: 'verificationDisabled' }],
      },
      // Database clients take the same option through `ssl`.
      {
        code: 'new Pool({ ssl: { rejectUnauthorized: false } })',
        errors: [{ messageId: 'verificationDisabled' }],
      },
      // Built standalone and spread later — flagged at the definition.
      {
        code: 'const tlsOptions = { rejectUnauthorized: false };',
        errors: [{ messageId: 'verificationDisabled' }],
      },
    ],
    valid: [
      // Verification on, or explicitly re-enabled — both fine.
      'https.request(url, { rejectUnauthorized: true })',
      // Supplying the CA is the correct remediation, not a finding.
      'new https.Agent({ ca: fs.readFileSync("ca.pem") })',
    ],
  },

  {
    // --- checkServerIdentity ------------------------------------------------
    invalid: [
      {
        // A no-op override accepts every hostname.
        code: 'tls.connect({ checkServerIdentity: () => {} })',
        errors: [{ messageId: 'hostnameVerificationDisabled' }],
      },
      {
        code: 'https.request(url, { checkServerIdentity() {} })',
        errors: [{ messageId: 'hostnameVerificationDisabled' }],
      },
    ],
    valid: [
      // An override that still throws on mismatch verifies something; we do
      // not model what, so we stay quiet rather than guess wrong.
      'tls.connect({ checkServerIdentity(host, cert) { if (host !== expected) throw new Error(host) } })',
    ],
  },

  {
    // --- not TLS options -----------------------------------------------------
    valid: [
      // Unrelated objects with same-shaped keys do not exist in practice for
      // these names, but the literal-false requirement keeps this honest:
      // a truthy or computed value is not a disabling assignment.
      'const options = { rejectUnauthorized: config.rejectUnauthorized }',
      'const options = { strictSSL: process.env.STRICT === "no" }',
    ],
    invalid: [],
  },
))
