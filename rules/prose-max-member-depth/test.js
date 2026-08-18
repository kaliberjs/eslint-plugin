const { test } = require('../../machinery/test')

test('prose-max-member-depth', {
  valid: [
    // Depth 1 — fine
    'const name = user.name',
    // Depth 2 — fine
    'const name = user.profile.name',
    // Depth 3 — fine (at the default max)
    'const name = user.profile.settings.name',
    // Optional chaining, depth 2 — fine
    'const name = user?.profile?.name',
    // Computed property, depth 2 — fine
    'const item = items[0].name',
    // Short destructuring is fine
    'const { name } = user.profile',
    // With max: 4 option, depth 4 is fine
    {
      code: 'const x = a.b.c.d.e',
      options: [{ max: 4 }],
    },
  ],
  invalid: [
    // Depth 4 — exceeds default max of 3
    {
      code: 'const x = config.server.salary.filter.range',
      errors: [{ messageId: 'maxMemberDepth' }],
    },
    // Depth 4 — deep config access
    {
      code: 'const x = data.clientConfig.salary.filter.enabledInCountries',
      errors: [{ messageId: 'maxMemberDepth' }],
    },
    // Depth 4 with optional chaining
    {
      code: 'const x = config?.client?.multiLanguage?.defaultLanguage?.code',
      errors: [{ messageId: 'maxMemberDepth' }],
    },
    // In a condition
    {
      code: 'function test(data) { if (data.a.b.c.d) return }',
      errors: [{ messageId: 'maxMemberDepth' }],
    },
    // With max: 1 option, depth 2 is reported
    {
      code: 'const x = a.b.c',
      options: [{ max: 1 }],
      errors: [{ messageId: 'maxMemberDepth' }],
    },
    // Should only report ONCE per chain (not once per intermediate node)
    {
      code: 'const x = a.b.c.d.e.f',
      errors: [{ messageId: 'maxMemberDepth' }],
    },
  ],
})
