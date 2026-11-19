const { test } = require('../../machinery/test')

test('security-detect-no-csrf-before-method-override', {
  valid: [
    // === Correct order: methodOverride THEN csrf ===
    `app.use(methodOverride()); app.use(csrf())`,
    `app.use(methodOverride())\napp.use(csrf())`,

    // === Correct order with middleware in between ===
    `app.use(methodOverride())\napp.use(helmet())\napp.use(csrf())`,

    // === Only methodOverride, no csrf ===
    `app.use(methodOverride())`,

    // === Only csrf, no methodOverride ===
    `app.use(csrf())`,

    // === Unrelated middleware ===
    `app.use(helmet())`,
    `app.use(bodyParser())`,
    `app.use(cors())`,

    // === No middleware at all ===
    `const x = 1`,

    // === .use() with non-CallExpression argument ===
    `app.use(express.static('public'))`,
    `app.use('/api', router)`,
    `app.use(myMiddleware)`,

    // === csrf/methodOverride NOT inside .use() ===
    `csrf()`,
    `methodOverride()`,
    `const a = csrf()\nconst b = methodOverride()`,

    // === Different method name (not .use) ===
    `app.get(csrf())\napp.get(methodOverride())`,
    `app.post(csrf())\napp.post(methodOverride())`,

    // === Member expression callee for the argument (not Identifier) ===
    `app.use(express.csrf())\napp.use(express.methodOverride())`,

    // === method called 'use' but argument callee name is different ===
    `app.use(csrfProtection())\napp.use(methodOverride())`,

    // === Empty .use() ===
    `app.use()`,

    // === .use() with string argument ===
    `app.use('/path')`,
  ],
  invalid: [
    // === Basic wrong order: csrf THEN methodOverride ===
    {
      code: `app.use(csrf()); app.use(methodOverride())`,
      errors: [{ messageId: 'csrfBeforeMethodOverride' }],
    },
    {
      code: `app.use(csrf())\napp.use(methodOverride())`,
      errors: [{ messageId: 'csrfBeforeMethodOverride' }],
    },

    // === Wrong order with middleware in between ===
    {
      code: `app.use(csrf())\napp.use(helmet())\napp.use(methodOverride())`,
      errors: [{ messageId: 'csrfBeforeMethodOverride' }],
    },
    {
      code: `app.use(csrf())\napp.use(bodyParser())\napp.use(cors())\napp.use(methodOverride())`,
      errors: [{ messageId: 'csrfBeforeMethodOverride' }],
    },

    // === csrf found, then multiple methodOverride calls ===
    {
      code: `app.use(csrf())\napp.use(methodOverride())\napp.use(methodOverride())`,
      errors: [
        { messageId: 'csrfBeforeMethodOverride' },
        { messageId: 'csrfBeforeMethodOverride' },
      ],
    },

    // === Different receiver objects ===
    {
      code: `server.use(csrf())\nserver.use(methodOverride())`,
      errors: [{ messageId: 'csrfBeforeMethodOverride' }],
    },
    {
      code: `express.use(csrf())\nexpress.use(methodOverride())`,
      errors: [{ messageId: 'csrfBeforeMethodOverride' }],
    },

    // === csrf with arguments ===
    {
      code: `app.use(csrf({ cookie: true }))\napp.use(methodOverride())`,
      errors: [{ messageId: 'csrfBeforeMethodOverride' }],
    },

    // === methodOverride with arguments ===
    {
      code: `app.use(csrf())\napp.use(methodOverride('_method'))`,
      errors: [{ messageId: 'csrfBeforeMethodOverride' }],
    },

    // === Both with arguments ===
    {
      code: `app.use(csrf({ cookie: true }))\napp.use(methodOverride('_method'))`,
      errors: [{ messageId: 'csrfBeforeMethodOverride' }],
    },

    // === Mixed with other .use() calls ===
    {
      code: `app.use(helmet())\napp.use(csrf())\napp.use(bodyParser())\napp.use(methodOverride())`,
      errors: [{ messageId: 'csrfBeforeMethodOverride' }],
    },
  ],
})
