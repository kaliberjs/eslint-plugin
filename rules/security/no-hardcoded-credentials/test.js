const { test, merge } = require('../../../machinery/test')

test('security-no-hardcoded-credentials', merge(
  {
    valid: [
      "createPool({ password: process.env.DB_PASSWORD })",
      "createPool({ password: dbPassword })",          // variable: unknown
      "smtpTransport({ auth: { user } })",             // no credential-shaped literal
      "form.set({ password: '' })",                    // placeholder junk stays quiet
      "mysql.createConnection({ host, port })",
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

  { valid: [], invalid: [] },
))
