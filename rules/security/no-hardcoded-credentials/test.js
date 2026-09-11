const { test, merge } = require('../../../machinery/test')

test('security-no-hardcoded-credentials', merge(
  {
    valid: [
      'createPool({ password: process.env.DB_PASSWORD })',
      'createPool({ password: dbPassword })',          // variable: unknown
      'smtpTransport({ auth: { user } })',             // no credential-shaped literal
      "form.set({ password: '' })",                    // placeholder junk stays quiet
      'mysql.createConnection({ host, port })',
    ],
    invalid: [
      {
        code: "createPool({ password: 'hunter2prod' })",
        errors: [{ messageId: 'hardcodedCredential' }],
      },
      {
        code: "const config = { apiSecret: 'live-secret-value' }",
        errors: [{ messageId: 'hardcodedCredential' }],
      },
      {
        code: "nodemailer.createTransport({ auth: { pass: 'mail-hunter2' } })",
        errors: [{ messageId: 'hardcodedCredential' }],
      },
      {
        code: "client.connect('mongodb://admin:s3cr3t@db.example.com')",
        errors: [{ messageId: 'connectionString' }],
      },
    ],
  },

  {
    // --- express-basic-auth's users map --------------------------------
    valid: [
      // Sourced from config/a secrets manager — the arbitrary username key
      // is expected, only a literal password value is the finding.
      'basicAuth({ users: { admin: config.fields.basicAuth.admin } })',
      'basicAuth({ users: { admin: process.env.ADMIN_PASSWORD } })',
      // Not a basicAuth call — the shape alone is not enough. A
      // username-to-role map has the exact same AST shape.
      "assignRoles({ users: { alice: 'editor', bob: 'viewer' } })",
      // No users property at all.
      "basicAuth({ realm: 'staging' })",
    ],
    invalid: [
      {
        // The real shape found across the surveyed projects: several
        // literal passwords under arbitrary username keys in one call.
        code: "basicAuth({ users: { dev: 'deze niet aan klanten geven!', klm: 'gzr4wuG2' } })",
        errors: [
          { messageId: 'hardcodedBasicAuthPassword' },
          { messageId: 'hardcodedBasicAuthPassword' },
        ],
      },
      {
        code: "expressBasicAuth({ users: { dev: 'not-for-customers' } })",
        errors: [{ messageId: 'hardcodedBasicAuthPassword' }],
      },
    ],
  },
))
