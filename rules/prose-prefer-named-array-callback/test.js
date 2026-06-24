const { test } = require('../../machinery/test')

test('prose-prefer-named-array-callback', {
  valid: [
    // ──────────────────────────────────────────────
    // Named references — always valid (not inline)
    // ──────────────────────────────────────────────
    `items.filter(isActiveItem)`,
    `items.find(isMatch)`,
    `items.every(isValidItem)`,
    `items.some(Boolean)`,
    `items.filter(Boolean)`,
    `items.map(formatItem)`,

    // ──────────────────────────────────────────────
    // Simple projections — identifier return
    // ──────────────────────────────────────────────
    `items.map(({ name }) => name)`,
    `items.filter(item => item)`,
    `items.find(item => item)`,
    `items.map(function(item) { return item })`,

    // ──────────────────────────────────────────────
    // Simple projections — shallow member access (depth ≤ 1)
    // ──────────────────────────────────────────────
    `items.map(item => item.name)`,
    `items.map(item => item.amount)`,
    `items.filter(item => item.active)`,
    `items.find(item => item.selected)`,
    `items.map(function(item) { return item.name })`,

    // ──────────────────────────────────────────────
    // Simple projections — single-property object
    // ──────────────────────────────────────────────
    `items.map(item => ({ id: item.id }))`,
    `items.map(item => ({ name: item.name }))`,
    `items.map(x => ({ key: x.key }))`,

    // ──────────────────────────────────────────────
    // Multi-property object — all simple values (no spreads/computed/calls/logic)
    // ──────────────────────────────────────────────
    `items.map(item => ({ id: item.id, name: item.name }))`,
    `items.map(x => ({ id: x.key, label: x.label, total: x.doc_count }))`,
    `items.map(item => ({ a: item.a, b: item.b, c: item.c, d: item.d }))`,
    `items.map(x => ({ id: x.id, label: x.label }))`,
    `items.map(({ id, name }) => ({ id, name }))`,
    `items.map(item => ({ title: item.title, url: item.url }))`,

    // ──────────────────────────────────────────────
    // Single comparison in filter/find/some/every — readable inline
    // ──────────────────────────────────────────────
    `items.find(item => item.status === 'active')`,
    `items.every(item => item.status !== 'archived')`,
    `items.filter(hit => hit._score > cosineSimThreshold)`,
    `items.some(item => item.count >= 10)`,
    `items.filter(item => item.age < maxAge)`,
    `items.find(x => x.id === targetId)`,
    `items.every(x => x.value !== null)`,
    `items.filter(item => item.type === 'page')`,

    // ──────────────────────────────────────────────
    // Nested member in .map() — exempt (data projection)
    // ──────────────────────────────────────────────
    `items.map(item => item.details.title)`,
    `items.map(x => x.data.label)`,
    `items.map(item => item.a.b.c)`,
    `items.map(x => ({ label: x.data.label, id: x.data.id }))`,
    `items.map(function(item) { return item.details.title })`,

    // ──────────────────────────────────────────────
    // Non-target methods — rule doesn't apply
    // ──────────────────────────────────────────────
    `items.forEach(item => item.active && notify(item))`,
    `items.reduce((total, item) => total + item.amount, 0)`,
    `items.flatMap(item => item.children.filter(child => child.visible))`,
    `items.sort((a, b) => a.name.localeCompare(b.name))`,

    // ──────────────────────────────────────────────
    // Computed method name — not matched
    // ──────────────────────────────────────────────
    `items[filter](item => item.active && !item.archived)`,
    `items[method](item => item.a.b.c && item.d)`,

    // ──────────────────────────────────────────────
    // CallExpression values in filter — NOT flagged by hasComplexObjectExpression
    // (only checked when there IS an object expression)
    // ──────────────────────────────────────────────
    `items.filter(x => filterNames.includes(x.id))`,
    `items.filter(x => someSet.has(x.key))`,
    `items.find(x => myPredicate(x))`,

    // ──────────────────────────────────────────────
    // Empty callbacks / edge cases
    // ──────────────────────────────────────────────
    `items.filter(() => true)`,
    `items.map(() => null)`,
    `items.map(() => 42)`,
  ],
  invalid: [
    // ──────────────────────────────────────────────
    // LogicalExpression in callback body
    // ──────────────────────────────────────────────
    {
      code: `items.filter(item => item.active && !item.archived)`,
      errors: [{ messageId: 'namedCallback' }],
    },
    {
      code: `items.filter(item => item.visible || item.promoted)`,
      errors: [{ messageId: 'namedCallback' }],
    },
    {
      code: `items.filter(function(item) { return item.active && item.visible })`,
      errors: [{ messageId: 'namedCallback' }],
    },
    {
      code: `items.some(item => item.ready && item.valid)`,
      errors: [{ messageId: 'namedCallback' }],
    },
    {
      code: `items.every(item => item.a && item.b)`,
      errors: [{ messageId: 'namedCallback' }],
    },
    {
      code: `items.find(item => item.type === 'x' && item.active)`,
      errors: [{ messageId: 'namedCallback' }],
    },
    // LogicalExpression inside .map() — still flags
    {
      code: `items.map(item => item.active && item.name)`,
      errors: [{ messageId: 'namedCallback' }],
    },

    // ──────────────────────────────────────────────
    // ConditionalExpression in callback body
    // ──────────────────────────────────────────────
    {
      code: `items.filter(item => item.active ? item.visible : item.fallbackVisible)`,
      errors: [{ messageId: 'namedCallback' }],
    },
    {
      code: `items.map(item => item.active ? item.name : item.fallback)`,
      errors: [{ messageId: 'namedCallback' }],
    },
    {
      code: `items.find(x => x.type === 'a' ? x.value : null)`,
      errors: [{ messageId: 'namedCallback' }],
    },
    // Conditional combined with logical
    {
      code: `items.map(item => item.active && item.visible ? item.name : item.fallback)`,
      errors: [{ messageId: 'namedCallback' }],
    },

    // ──────────────────────────────────────────────
    // Nested member in predicate methods (not .map)
    // ──────────────────────────────────────────────
    {
      code: `items.some(function(item) { return item.meta.enabled })`,
      errors: [{ messageId: 'namedCallback' }],
    },
    {
      code: `items.filter(item => item.a.b.c)`,
      errors: [{ messageId: 'namedCallback' }],
    },
    {
      code: `items.find(item => item.data.active)`,
      errors: [{ messageId: 'namedCallback' }],
    },
    {
      code: `items.every(item => item.config.settings.enabled)`,
      errors: [{ messageId: 'namedCallback' }],
    },
    {
      code: `items.some(x => x.nested.value)`,
      errors: [{ messageId: 'namedCallback' }],
    },

    // ──────────────────────────────────────────────
    // Complex object expressions — spread
    // ──────────────────────────────────────────────
    {
      code: `items.map(x => ({ ...x, active: true }))`,
      errors: [{ messageId: 'namedCallback' }],
    },
    {
      code: `items.map(x => ({ ...x, active: isActive(x) }))`,
      errors: [{ messageId: 'namedCallback' }],
    },
    {
      code: `items.map(x => ({ ...x }))`,
      errors: [{ messageId: 'namedCallback' }],
    },

    // ──────────────────────────────────────────────
    // Complex object expressions — computed keys
    // ──────────────────────────────────────────────
    {
      code: `items.map(x => ({ [x.key]: x.value }))`,
      errors: [{ messageId: 'namedCallback' }],
    },

    // ──────────────────────────────────────────────
    // Complex object expressions — call expression values
    // ──────────────────────────────────────────────
    {
      code: `items.map(x => ({ id: x.id, label: getLabel(x) }))`,
      errors: [{ messageId: 'namedCallback' }],
    },
    {
      code: `items.map(x => ({ formatted: format(x.value) }))`,
      errors: [{ messageId: 'namedCallback' }],
    },

    // ──────────────────────────────────────────────
    // Complex object expressions — logical/conditional values
    // ──────────────────────────────────────────────
    {
      code: `items.map(x => ({ value: x.a || x.b }))`,
      errors: [{ messageId: 'namedCallback' }],
    },
    {
      code: `items.map(x => ({ value: x.a ? x.b : x.c }))`,
      errors: [{ messageId: 'namedCallback' }],
    },

    // ──────────────────────────────────────────────
    // Multi-statement body (no extractable single return)
    // ──────────────────────────────────────────────
    {
      code: `items.filter(item => { const visible = item.visible; return visible })`,
      errors: [{ messageId: 'namedCallback' }],
    },
    {
      code: `items.map(item => { const x = item.name; return { id: item.id, name: x } })`,
      errors: [{ messageId: 'namedCallback' }],
    },

    // ──────────────────────────────────────────────
    // Combinations — multiple complexity signals
    // ──────────────────────────────────────────────
    {
      code: `items.filter(x => x.a.b && x.c)`,
      errors: [{ messageId: 'namedCallback' }],
    },
    {
      code: `items.find(x => x.type === 'page' && x.data.active)`,
      errors: [{ messageId: 'namedCallback' }],
    },
  ],
})
