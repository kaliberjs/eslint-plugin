const { test } = require('../../machinery/test')

test('security-no-hardcoded-credentials', {
  valid: [
    // Non-credential variable name
    `const username = "john_doe"`,

    // Empty string (excluded)
    `const password = ""`,

    // Short value < 4 chars (excluded)
    `const password = "abc"`,

    // Non-string value (number)
    `const password = 12345`,

    // Non-string value (boolean)
    `const secret = true`,

    // Non-string value (null)
    `const token = null`,

    // Non-string value (undefined)
    `const apiKey = undefined`,

    // Variable reference (not a literal)
    `const password = process.env.PASSWORD`,

    // Template literal (not a Literal node)
    "const password = `${process.env.SECRET}`",

    // Non-credential names with long strings
    `const name = "this is a normal name"`,
    `const description = "some long description here"`,
    `const title = "my application title here"`,

    // Object property with non-credential key
    `const config = { hostname: "localhost" }`,

    // Assignment to non-credential
    `hostname = "myserver.example.com"`,

    // Member expression with non-credential property
    `config.hostname = "myserver.example.com"`,

    // API key pattern but too short (< 8 chars)
    `const key = "AKIA123"`,

    // Non-matching API key pattern
    `const key = "not-an-api-key-at-all"`,

    // require() call (not an assignment of interest)
    `const crypto = require('crypto')`,

    // Array value (not a string literal)
    `const password = [1, 2, 3]`,

    // Object value (not a string literal)
    `const secret = { key: "value" }`,
  ],
  invalid: [
    // VariableDeclarator: password
    {
      code: `const password = "super_secret_123"`,
      errors: [{ messageId: 'hardcodedCredential' }],
    },
    // VariableDeclarator: passwd
    {
      code: `const passwd = "my_password"`,
      errors: [{ messageId: 'hardcodedCredential' }],
    },
    // VariableDeclarator: secret
    {
      code: `const secret = "top_secret_value"`,
      errors: [{ messageId: 'hardcodedCredential' }],
    },
    // VariableDeclarator: apiKey
    {
      code: `const apiKey = "some_api_key_value"`,
      errors: [{ messageId: 'hardcodedCredential' }],
    },
    // VariableDeclarator: api_key
    {
      code: `const api_key = "some_key_value"`,
      errors: [{ messageId: 'hardcodedCredential' }],
    },
    // VariableDeclarator: token
    {
      code: `const token = "my_token_value"`,
      errors: [{ messageId: 'hardcodedCredential' }],
    },
    // VariableDeclarator: auth_token
    {
      code: `const auth_token = "auth_tok_1234"`,
      errors: [{ messageId: 'hardcodedCredential' }],
    },
    // VariableDeclarator: authToken
    {
      code: `const authToken = "auth_tok_1234"`,
      errors: [{ messageId: 'hardcodedCredential' }],
    },
    // VariableDeclarator: access_token
    {
      code: `const access_token = "atok_1234567"`,
      errors: [{ messageId: 'hardcodedCredential' }],
    },
    // VariableDeclarator: accessToken
    {
      code: `const accessToken = "atok_1234567"`,
      errors: [{ messageId: 'hardcodedCredential' }],
    },
    // VariableDeclarator: private_key
    {
      code: `const private_key = "-----BEGIN RSA"`,
      errors: [{ messageId: 'hardcodedCredential' }],
    },
    // VariableDeclarator: privateKey
    {
      code: `const privateKey = "-----BEGIN RSA"`,
      errors: [{ messageId: 'hardcodedCredential' }],
    },
    // VariableDeclarator: credential
    {
      code: `const credential = "cred_value_1234"`,
      errors: [{ messageId: 'hardcodedCredential' }],
    },
    // VariableDeclarator: client_secret
    {
      code: `const client_secret = "cs_12345678"`,
      errors: [{ messageId: 'hardcodedCredential' }],
    },
    // VariableDeclarator: clientSecret
    {
      code: `const clientSecret = "cs_12345678"`,
      errors: [{ messageId: 'hardcodedCredential' }],
    },
    // Case insensitive: PASSWORD
    {
      code: `const PASSWORD = "UPPER_CASE_PASS"`,
      errors: [{ messageId: 'hardcodedCredential' }],
    },
    // AssignmentExpression: Identifier left
    {
      code: `password = "new_password_here"`,
      errors: [{ messageId: 'hardcodedCredential' }],
    },
    // AssignmentExpression: MemberExpression left
    {
      code: `config.password = "secret_password"`,
      errors: [{ messageId: 'hardcodedCredential' }],
    },
    // AssignmentExpression: MemberExpression with token
    {
      code: `this.token = "my_long_token_value"`,
      errors: [{ messageId: 'hardcodedCredential' }],
    },
    // Property in object literal
    {
      code: `const config = { password: "hard_coded_pw" }`,
      errors: [{ messageId: 'hardcodedCredential' }],
    },
    // Property: secret in object
    {
      code: `const obj = { secret: "the_secret_value" }`,
      errors: [{ messageId: 'hardcodedCredential' }],
    },
    // API key pattern: AWS key (AKIA...)
    {
      code: `const key = "AKIA1234567890ABCDEF"`,
      errors: [{ messageId: 'hardcodedCredential' }],
    },
    // API key pattern: GitHub personal access token (ghp_...)
    {
      code: `const key = "ghp_ABCDEFghijklmnopqrstuvwxyz0123456789"`,
      errors: [{ messageId: 'hardcodedCredential' }],
    },
    // API key pattern: OpenAI key (sk-...)
    {
      code: `const key = "sk-abcdefghijklmnopqrstuvwxyz0123456"`,
      errors: [{ messageId: 'hardcodedCredential' }],
    },
    // API key pattern: Slack token (xoxb-...)
    {
      code: `const key = "xoxb-123456789-abcdefghij"`,
      errors: [{ messageId: 'hardcodedCredential' }],
    },
    // API key in Property
    {
      code: `const config = { key: "AKIA1234567890ABCDEF" }`,
      errors: [{ messageId: 'hardcodedCredential' }],
    },
    // API key in AssignmentExpression
    {
      code: `key = "AKIA1234567890ABCDEF"`,
      errors: [{ messageId: 'hardcodedCredential' }],
    },
    // Multiple credentials in one object (two errors)
    {
      code: `const config = {\n  password: "hard_coded",\n  secret: "also_hardcoded"\n}`,
      errors: [
        { messageId: 'hardcodedCredential' },
        { messageId: 'hardcodedCredential' },
      ],
    },
  ],
})
