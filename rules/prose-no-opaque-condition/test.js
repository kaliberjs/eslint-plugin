const { test } = require('../../machinery/test')

test('prose-no-opaque-condition', {
  valid: [
    // ──────────────────────────────────────────────
    // Identifiers — always readable
    // ──────────────────────────────────────────────
    `function test(ready) { if (ready) return }`,
    `function test(x) { if (x) doSomething() }`,

    // ──────────────────────────────────────────────
    // Shallow member expressions (depth ≤ 1)
    // ──────────────────────────────────────────────
    `function test(user) { if (user.active) return }`,
    `function test(response) { if (response.ok) return }`,
    `function test(config) { if (config.enabled) doSomething() }`,

    // ──────────────────────────────────────────────
    // .length access — readable at any depth
    // ──────────────────────────────────────────────
    `function test(items) { if (items.length) return }`,
    `function test(filters) { if (filters.sub_expertise.length) return }`,
    `function test(x) { if (x.a.b.c.length) return }`,
    `function test(filters) { if (filters.sub_expertise.length && filters.job_branch.length) return }`,

    // ──────────────────────────────────────────────
    // Nullish comparisons — always readable
    // ──────────────────────────────────────────────
    `function test(value) { if (value === null) return }`,
    `function test(value) { if (value !== null) return }`,
    `function test(value) { if (value === undefined) return }`,
    `function test(value) { if (value !== undefined) return }`,
    `function test(value) { if (null === value) return }`,
    `function test(value) { if (undefined !== value) return }`,

    // ──────────────────────────────────────────────
    // Simple named comparisons — identifier/literal/shallow member operands
    // ──────────────────────────────────────────────
    // Identifier vs identifier
    `function test(a, b) { if (a === b) return }`,
    `function test(a, b) { if (a > b) return }`,
    `function test(a, b) { if (a !== b) return }`,
    `function test(a, b) { if (a <= b) return }`,
    `if (daysSinceRenewal > gracePeriodDays) cancelSubscription(user)`,

    // Identifier vs literal
    `function test(status) { if (status === 'active') return }`,
    `function test(query) { if (query === '') return }`,
    `function test(count) { if (count > 100) return }`,
    `function test(count) { if (count >= 0) return }`,
    `function test(x) { if (x !== false) return }`,
    `function test(x) { if (x !== 0) return }`,
    `function test(code) { if (code === 42) return }`,

    // Shallow member vs literal
    `function test(item) { if (item.status === 'active') return }`,
    `function test(job) { if (job.salary > 50000) return }`,

    // Shallow member vs identifier
    `function test(a, b) { if (a.count > b.count) return }`,
    `function test(status) { if (status === Statuses.ACTIVE) return }`,
    `function test(status) { if (status === ACTIVE_STATUS) return }`,

    // ──────────────────────────────────────────────
    // Predicate calls — readable
    // ──────────────────────────────────────────────
    `function test(response) { if (isMissingDocumentType(response)) return }`,
    `function test(user) { if (hasPermission(user)) return }`,
    `function test(form) { if (canSubmit(form)) return }`,
    `function test(state) { if (shouldRetry(state)) return }`,
    `function test(task) { if (wasCompleted(task)) return }`,

    // Negated predicates
    `function test(user) { if (!isReady(user)) return }`,
    `function test(x) { if (!hasItems(x)) return }`,

    // Negated identifiers
    `function test(user) { if (!user) return }`,
    `function test(ready) { if (!ready) doSomething() }`,

    // ──────────────────────────────────────────────
    // Logical expressions — named predicates within clause limit
    // ──────────────────────────────────────────────
    // 2 clauses (under default 3)
    `function test(user, form) { if (isReady(user) && canSubmit(form)) return }`,
    `function test(user) { if (hasRole(user) || isAdmin(user)) return }`,

    // 3 clauses (at default limit)
    `function test(user, form, account) { if (isReady(user) && canSubmit(form) && hasAccount(account)) return }`,
    `function test(a, b, c) { if (isA(a) || isB(b) || isC(c)) return }`,

    // Mixed readable clauses in logical expressions
    `function test(query) { if (!query || query === '') return }`,
    `function test(x) { if (x === null || x === undefined) return }`,
    `function test(user) { if (user && isActive(user)) return }`,
    `function test(user) { if (!user || !isValid(user)) return }`,
    `function test(a) { if (a.length && isReady(a)) return }`,

    // Readable binary + readable identifier in logical
    `function test(user) { if (user.active && user.verified) return }`,
    `function test(x, y) { if (x > 0 && y > 0) return }`,
    `function test(status) { if (status === 'a' || status === 'b' || status === 'c') return }`,

    // ──────────────────────────────────────────────
    // typeof comparisons — ignored by default
    // ──────────────────────────────────────────────
    `function test(value) { if (typeof value === 'string') return }`,
    `function test(value) { if ('string' === typeof value) return }`,
    `function test(value) { if (typeof value !== 'object') return }`,
    `function test(value) { if (typeof value === 'function') return }`,
    `function test(value) { if (typeof value === 'number') return }`,
    `function test(value) { if (typeof value === 'undefined') return }`,
    `function test(value) { if (typeof value !== 'boolean') return }`,

    // ──────────────────────────────────────────────
    // For loop tests — ignored by default
    // ──────────────────────────────────────────────
    `function test(items) { for (let i = 0; i < items.length; i++) render(items[i]) }`,
    `function test(n) { for (let x = 0; x < n; x++) process(x) }`,

    // ──────────────────────────────────────────────
    // Ternary — same logic applies
    // ──────────────────────────────────────────────
    `const x = isReady(user) ? 'yes' : 'no'`,
    `const x = user.active ? 'online' : 'offline'`,
    `const x = status === 'active' ? render() : null`,
    `const x = value !== null ? value : fallback`,

    // ──────────────────────────────────────────────
    // While / do-while
    // ──────────────────────────────────────────────
    `function test(item) { while (isPending(item)) poll(item) }`,
    `function test(q) { while (q.length) process(q.pop()) }`,
    `function test(item) { do { poll(item) } while (isPending(item)) }`,

    // ──────────────────────────────────────────────
    // Option overrides — valid with specific options
    // ──────────────────────────────────────────────
    {
      code: `function test(items) { for (let i = 0; i < items.length; i++) render(items[i]) }`,
      options: [{ ignoreForLoopTests: true }],
    },
    {
      code: `function test(value) { if (typeof value === 'string') return }`,
      options: [{ ignoreTypeofComparisons: true }],
    },
    {
      code: `function test(items) { for (let i = 0; i < items.length; i++) render(items[i]) }`,
      options: [{ ignoreForLoopTests: false }],
    },
    {
      code: `function test(a, b, c, d) { if (isA(a) && isB(b) && isC(c) && isD(d)) return }`,
      options: [{ maxNamedPredicateClauses: 4 }],
    },

    // ──────────────────────────────────────────────
    // Rabobank audit — verified non-flagging patterns
    // ──────────────────────────────────────────────
    `function test(feature) { if (feature.startsWith('Semantic')) return }`, // CallExpression, not a predicate name → not "readable" → but it's also not a LogicalExpression/BinaryExpression/UnaryExpression/nested-member. It's a CallExpression at depth 0. Falls through to hasNestedMemberExpression which checks children. feature is depth-0, 'Semantic' is a literal. No nested member → not opaque.
    `function test(country) { if (showSalaryFilter) return }`,
    `function test(email) { if (!email) return }`,
  ],
  invalid: [
    // ──────────────────────────────────────────────
    // Nested member access (depth > 1) — opaque
    // ──────────────────────────────────────────────
    {
      code: `function test(response) { if (!response.data._type) return }`,
      errors: [{ messageId: 'opaqueCondition' }],
    },
    {
      code: `function test(x) { if (x.a.b) return }`,
      errors: [{ messageId: 'opaqueCondition' }],
    },
    {
      code: `function test(config) { if (!config.server.enabled) return }`,
      errors: [{ messageId: 'opaqueCondition' }],
    },

    // ──────────────────────────────────────────────
    // Logical with too many clauses (> 3 default)
    // ──────────────────────────────────────────────
    {
      code: `if (user && user.role === 'admin' && user.active && !user.suspended) grantAccess()`,
      errors: [{ messageId: 'opaqueCondition' }],
    },
    {
      code: `if (isReady(user) && canSubmit(form) && hasAccount(account) && shouldNotify(user)) submit(form)`,
      errors: [{ messageId: 'opaqueCondition' }],
    },
    {
      code: `if (a && b && c && d) doSomething()`,
      errors: [{ messageId: 'opaqueCondition' }],
    },

    // ──────────────────────────────────────────────
    // Logical with unreadable clauses
    // ──────────────────────────────────────────────
    {
      code: `if (user.permissions.write && user.preferences.notifications.email) notify(user)`,
      errors: [{ messageId: 'opaqueCondition' }],
    },
    {
      code: `if (response.data && response.data._type && response.data.slug.current) render(response)`,
      errors: [{ messageId: 'opaqueCondition' }],
    },
    {
      code: `if (a.b.c && d) doSomething()`,
      errors: [{ messageId: 'opaqueCondition' }],
    },
    {
      code: `if (x || y.z.w) doSomething()`,
      errors: [{ messageId: 'opaqueCondition' }],
    },

    // ──────────────────────────────────────────────
    // Ternary with opaque test
    // ──────────────────────────────────────────────
    {
      code: `const label = user.active && user.permissions.write ? 'yes' : 'no'`,
      errors: [{ messageId: 'opaqueCondition' }],
    },
    {
      code: `const x = a.b.c ? 'yes' : 'no'`,
      errors: [{ messageId: 'opaqueCondition' }],
    },

    // ──────────────────────────────────────────────
    // Binary with deep member operand (not simple)
    // ──────────────────────────────────────────────
    {
      code: `function test(x) { if (x.a.b === 'value') return }`,
      errors: [{ messageId: 'opaqueCondition' }],
    },
    {
      code: `function test(x) { if (x.a.b > x.c.d) return }`,
      errors: [{ messageId: 'opaqueCondition' }],
    },

    // ──────────────────────────────────────────────
    // Unary with nested member (opaque negation)
    // ──────────────────────────────────────────────
    {
      code: `function test(user) { if (!user.data.active) return }`,
      errors: [{ messageId: 'opaqueCondition' }],
    },

    // ──────────────────────────────────────────────
    // Option overrides — invalid with specific options
    // ──────────────────────────────────────────────
    {
      code: `function test(value) { if (typeof value === 'string') return }`,
      options: [{ ignoreTypeofComparisons: false }],
      errors: [{ messageId: 'opaqueCondition' }],
    },
    {
      code: `if (isReady(user) && canSubmit(form) && hasAccount(account)) submit(form)`,
      options: [{ maxNamedPredicateClauses: 2 }],
      errors: [{ messageId: 'opaqueCondition' }],
    },
    {
      code: `if (aVeryLongNameForTheCurrentUser && aVeryLongNameForTheCurrentUser.permissions.write) grantAccess()`,
      options: [{ maxLength: 40 }],
      errors: [{ messageId: 'opaqueCondition' }],
    },

    // ──────────────────────────────────────────────
    // .length — readable, but the sibling clause is not
    // ──────────────────────────────────────────────
    {
      code: `if (items.length && items[0].data.nested) doSomething()`,
      errors: [{ messageId: 'opaqueCondition' }],
    },

    // ──────────────────────────────────────────────
    // CallExpression with nested member (not a predicate call)
    // ──────────────────────────────────────────────
    {
      code: `function test(x) { if (x.data.items.includes(y)) return }`,
      errors: [{ messageId: 'opaqueCondition' }],
    },

    // ──────────────────────────────────────────────
    // While / do-while with opaque conditions
    // ──────────────────────────────────────────────
    {
      code: `function test(x) { while (x.a.b) poll() }`,
      errors: [{ messageId: 'opaqueCondition' }],
    },
    {
      code: `function test(x) { do { poll() } while (x.a.b) }`,
      errors: [{ messageId: 'opaqueCondition' }],
    },
  ],
})
