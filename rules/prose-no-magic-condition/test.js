const { test } = require('../../machinery/test')

test('prose-no-magic-condition', {
  valid: [
    // ───────────────────────────────────────────────
    // No literals at all — pure predicate / constant
    // ───────────────────────────────────────────────
    `if (isAdult(person)) grantAccess()`,
    `if (retries > MAX_RETRY_ATTEMPTS) throw new Error('Failed')`,
    `function test(status) { if (status === ACTIVE_STATUS) return }`,
    `function test(items) { if (items.length === EMPTY_LENGTH) return }`,
    `function test(value) { if (value instanceof HTMLElement) return }`,
    `const result = isReady ? doStuff() : wait()`,
    `while (shouldContinue()) run()`,
    `do { run() } while (shouldContinue())`,
    `for (let i = 0; hasMore(i); i++) process(i)`,

    // ───────────────────────────────────────────────
    // Boolean literals (ignoreBoolean defaults true)
    // ───────────────────────────────────────────────
    `function test(enabled) { if (enabled === true) return }`,
    `function test(flag) { if (flag !== false) return }`,
    `const result = done === true ? 'yes' : 'no'`,

    // ───────────────────────────────────────────────
    // Nullish literals (ignoreNullish defaults true)
    // ───────────────────────────────────────────────
    `function test(value) { if (value == null) return }`,
    `function test(value) { if (value === undefined) return }`,
    `function test(value) { if (value === null) return }`,
    `function test(value) { if (value === null || value === undefined) return }`,
    `function test(value) { if (null === value) return }`,

    // ───────────────────────────────────────────────
    // typeof comparisons (ignoreTypeof defaults true)
    // ───────────────────────────────────────────────
    `function test(value) { if (typeof value === 'string') return }`,
    `function test(value) { if ('string' === typeof value) return }`,
    `function test(value) { if (typeof value !== 'object') return }`,
    `function test(value) { if (typeof value === 'function') return }`,
    `function test(value) { if (typeof value === 'number') return }`,
    `function test(value) { if (typeof value === 'boolean') return }`,
    `function test(value) { if (typeof value === 'undefined') return }`,
    `function test(value) { if (typeof value === 'symbol') return }`,
    `function test(value) { if (typeof value === 'bigint') return }`,
    `function test(value) { if (typeof value != 'string') return }`,

    // ───────────────────────────────────────────────
    // Structural values (allowStructural defaults true: 0, 1, -1)
    // ───────────────────────────────────────────────
    `function test(items) { if (items.length === 0) return }`,
    `function test(items) { if (items.length > 0) return }`,
    `function test(index) { if (index === -1) return }`,
    `function test(items) { if (items.length === 1) return }`,
    `function test(items) { if (items.length >= 1) return }`,
    `for (let i = 0; i < items.length; i++) process(i)`,

    // ───────────────────────────────────────────────
    // String literals (ignoreStringLiterals defaults true)
    // ───────────────────────────────────────────────

    // Single string comparison
    `if (user.role === 'admin') grantAccess()`,
    `function test(status) { if (status === 'idle') return }`,
    `function test(status) { if (status === 'active') return }`,
    `function test(country) { if (country === 'nl') return }`,
    `function test(type) { if (type !== 'semantic') return }`,

    // Multiple string comparisons in one condition
    `if (status === 'expired' || status === 'cancelled') hideSubscription()`,

    // Template literal (static, no expressions — string equivalent)
    `function test(role) { if (role === \`admin\`) return }`,

    // String in ternary
    `const label = value === 'x' ? 'A' : 'B'`,

    // String comparisons as the value being compared against (word 'undefined' vs keyword)
    `function test(status) { if (status === 'undefined') return }`,

    // Empty string comparison
    `function test(query) { if (query === '') return }`,

    // ───────────────────────────────────────────────
    // allow option — explicit allowlist
    // ───────────────────────────────────────────────
    {
      code: `function test(status) { if (status === 'idle' || status === 'loading') return }`,
      options: [{ allow: ['idle', 'loading'] }],
    },
    {
      code: `function test(status) { if (status === 'idle') return }`,
      options: [{ allow: ['idle'] }],
    },
    {
      code: `function test(retries) { if (retries > 5) return }`,
      options: [{ allow: [5] }],
    },

    // ───────────────────────────────────────────────
    // Option: explicit ignoreBoolean: true (redundant but exercised)
    // ───────────────────────────────────────────────
    {
      code: `function test(enabled) { if (enabled === true) return }`,
      options: [{ ignoreBoolean: true }],
    },

    // ───────────────────────────────────────────────
    // Option: explicit ignoreNullish: true (redundant but exercised)
    // ───────────────────────────────────────────────
    {
      code: `function test(value) { if (value === null) return }`,
      options: [{ ignoreNullish: true }],
    },

    // ───────────────────────────────────────────────
    // Option: explicit ignoreStringLiterals: true (redundant but exercised)
    // ───────────────────────────────────────────────
    {
      code: `if (role === 'admin') grantAccess()`,
      options: [{ ignoreStringLiterals: true }],
    },

    // ───────────────────────────────────────────────
    // Static template literal + allow (string in allowed set)
    // ───────────────────────────────────────────────
    {
      code: 'function test(role) { if (role === `editor`) return }',
      options: [{ ignoreStringLiterals: false, allow: ['editor'] }],
    },

    // ───────────────────────────────────────────────
    // Number in allowlist removes its magic-ness
    // ───────────────────────────────────────────────
    {
      code: `if (retries > 3 && attempts > 5) run()`,
      options: [{ allow: [3, 5] }],
    },

    // ───────────────────────────────────────────────
    // Combined: string + number in condition, both in allow
    // ───────────────────────────────────────────────
    {
      code: `if (status === 'active' && retries > 3) run()`,
      options: [{ ignoreStringLiterals: false, allow: ['active', 3] }],
    },

    // ───────────────────────────────────────────────
    // Combined: ignoreTypeof: false BUT string in allow list → no error
    // (covers the allowedValues.has() branch inside typeof detection)
    // ───────────────────────────────────────────────
    {
      code: `function test(value) { if (typeof value === 'string') return }`,
      options: [{ ignoreTypeof: false, allow: ['string'] }],
    },

    // ───────────────────────────────────────────────
    // Object property key — not a condition operand
    // ───────────────────────────────────────────────
    `function test(item) { if ({ type: 'special' }[item]) return }`,

    // ───────────────────────────────────────────────
    // No condition — non-condition contexts should not flag
    // (rule only visits IfStatement, Conditional, While, DoWhile, For)
    // ───────────────────────────────────────────────
    `const x = 'admin'`,
    `const y = 42`,
    `function process() { return 3 }`,
  ],
  invalid: [
    // ═══════════════════════════════════════════════
    // NUMBERS (always magic by default)
    // ═══════════════════════════════════════════════

    // ── IfStatement ──
    {
      code: `if (retries > 3) throw new Error('Failed')`,
      errors: [{ messageId: 'magicCondition' }],
    },
    {
      code: `if (discountPercentage >= 10) applyDiscount()`,
      errors: [{ messageId: 'magicCondition' }],
    },
    {
      code: `if (age >= 18) grantAccess()`,
      errors: [{ messageId: 'magicCondition' }],
    },
    {
      code: `if (score < 50) fail()`,
      errors: [{ messageId: 'magicCondition' }],
    },
    {
      code: `if (items.length > 100) truncate()`,
      errors: [{ messageId: 'magicCondition' }],
    },

    // ── Negative numbers (non-structural) ──
    {
      code: `if (temperature < -40) freeze()`,
      errors: [{ messageId: 'magicCondition' }],
    },

    // ── Floating point ──
    {
      code: `if (ratio > 0.5) adjustLayout()`,
      errors: [{ messageId: 'magicCondition' }],
    },

    // ── Multiple numbers in one condition ──
    {
      code: `if (x > 3 && y < 10) run()`,
      errors: [
        { messageId: 'magicCondition' },
        { messageId: 'magicCondition' },
      ],
    },

    // ── WhileStatement ──
    {
      code: `while (attempt < 5) attempt++`,
      errors: [{ messageId: 'magicCondition' }],
    },

    // ── DoWhileStatement ──
    {
      code: `do { run() } while (count < 3)`,
      errors: [{ messageId: 'magicCondition' }],
    },

    // ── ForStatement ──
    {
      code: `for (let i = 0; i < 10; i++) process(i)`,
      errors: [{ messageId: 'magicCondition' }],
    },

    // ── ConditionalExpression (ternary) ──
    {
      code: `const label = count > 5 ? 'many' : 'few'`,
      errors: [{ messageId: 'magicCondition' }],
    },

    // ═══════════════════════════════════════════════
    // REGEX (always magic)
    // ═══════════════════════════════════════════════
    {
      code: `function test(trackingId) { if (/^cta-/.test(trackingId)) return }`,
      errors: [{ messageId: 'magicCondition' }],
    },
    {
      code: `if (/[0-9]+/.test(input)) validate()`,
      errors: [{ messageId: 'magicCondition' }],
    },

    // ═══════════════════════════════════════════════
    // BIGINT (always magic)
    // ═══════════════════════════════════════════════
    {
      code: `function test(count) { if (BigInt(count) > 10n) return }`,
      errors: [{ messageId: 'magicCondition' }],
    },

    // ═══════════════════════════════════════════════
    // STRINGS — flag only with ignoreStringLiterals: false
    // ═══════════════════════════════════════════════

    // ── Single string ──
    {
      code: `if (user.role === 'admin') grantAccess()`,
      options: [{ ignoreStringLiterals: false }],
      errors: [{ messageId: 'magicCondition' }],
    },

    // ── Multiple strings in one condition ──
    {
      code: `if (status === 'expired' || status === 'cancelled') hideSubscription()`,
      options: [{ ignoreStringLiterals: false }],
      errors: [
        { messageId: 'magicCondition' },
        { messageId: 'magicCondition' },
      ],
    },

    // ── Static template literal (string equivalent) ──
    {
      code: `function test(role) { if (role === \`admin\`) return }`,
      options: [{ ignoreStringLiterals: false }],
      errors: [{ messageId: 'magicCondition' }],
    },

    // ── String value 'undefined' (not the keyword, just a string) ──
    {
      code: `function test(status) { if (status === 'undefined') return }`,
      options: [{ ignoreStringLiterals: false }],
      errors: [{ messageId: 'magicCondition' }],
    },

    // ── Empty string ──
    {
      code: `function test(query) { if (query === '') return }`,
      options: [{ ignoreStringLiterals: false }],
      errors: [{ messageId: 'magicCondition' }],
    },

    // ── String in ternary ──
    {
      code: `const label = status === 'active' ? show() : hide()`,
      options: [{ ignoreStringLiterals: false }],
      errors: [{ messageId: 'magicCondition' }],
    },

    // ── String in while ──
    {
      code: `while (state !== 'done') poll()`,
      options: [{ ignoreStringLiterals: false }],
      errors: [{ messageId: 'magicCondition' }],
    },

    // ── String in for ──
    {
      code: `for (let s = next(); s !== 'end'; s = next()) process(s)`,
      options: [{ ignoreStringLiterals: false }],
      errors: [{ messageId: 'magicCondition' }],
    },

    // ═══════════════════════════════════════════════
    // OPTION INTERACTION: ignoreTypeof vs ignoreStringLiterals
    // ═══════════════════════════════════════════════

    // ignoreTypeof: false OVERRIDES ignoreStringLiterals: true (default)
    // → the 'string' operand in typeof comparison should STILL flag
    {
      code: `function test(value) { if (typeof value === 'string') return }`,
      options: [{ ignoreTypeof: false }],
      errors: [{ messageId: 'magicCondition' }],
    },

    // ignoreTypeof: false with reversed operand order
    {
      code: `function test(value) { if ('number' === typeof value) return }`,
      options: [{ ignoreTypeof: false }],
      errors: [{ messageId: 'magicCondition' }],
    },

    // ignoreTypeof: false with !== operator
    {
      code: `function test(value) { if (typeof value !== 'object') return }`,
      options: [{ ignoreTypeof: false }],
      errors: [{ messageId: 'magicCondition' }],
    },

    // ignoreTypeof: false AND ignoreStringLiterals: false
    {
      code: `function test(value) { if (typeof value === 'string') return }`,
      options: [{ ignoreTypeof: false, ignoreStringLiterals: false }],
      errors: [{ messageId: 'magicCondition' }],
    },

    // ═══════════════════════════════════════════════
    // OPTION: ignoreBoolean: false
    // ═══════════════════════════════════════════════
    {
      code: `function test(enabled) { if (enabled === true) return }`,
      options: [{ ignoreBoolean: false }],
      errors: [{ messageId: 'magicCondition' }],
    },
    {
      code: `function test(flag) { if (flag !== false) return }`,
      options: [{ ignoreBoolean: false }],
      errors: [{ messageId: 'magicCondition' }],
    },

    // ═══════════════════════════════════════════════
    // OPTION: ignoreNullish: false
    // ═══════════════════════════════════════════════
    {
      code: `function test(value) { if (value === null) return }`,
      options: [{ ignoreNullish: false }],
      errors: [{ messageId: 'magicCondition' }],
    },

    // ═══════════════════════════════════════════════
    // OPTION: allowStructural: false
    // ═══════════════════════════════════════════════
    {
      code: `function test(items) { if (items.length === 0) return }`,
      options: [{ allowStructural: false }],
      errors: [{ messageId: 'magicCondition' }],
    },
    {
      code: `function test(items) { if (items.length === 1) return }`,
      options: [{ allowStructural: false }],
      errors: [{ messageId: 'magicCondition' }],
    },
    {
      code: `function test(index) { if (index === -1) return }`,
      options: [{ allowStructural: false }],
      errors: [{ messageId: 'magicCondition' }],
    },

    // ═══════════════════════════════════════════════
    // OPTION COMBINATIONS
    // ═══════════════════════════════════════════════

    // Number + string in same condition: only number flags with defaults
    {
      code: `if (role === 'admin' && retries > 3) restrict()`,
      errors: [{ messageId: 'magicCondition' }],
    },

    // Number + string: both flag when ignoreStringLiterals: false
    {
      code: `if (role === 'admin' && retries > 3) restrict()`,
      options: [{ ignoreStringLiterals: false }],
      errors: [
        { messageId: 'magicCondition' },
        { messageId: 'magicCondition' },
      ],
    },

    // allow: number but not the string → only string flags
    {
      code: `if (status === 'active' && retries > 3) run()`,
      options: [{ ignoreStringLiterals: false, allow: [3] }],
      errors: [{ messageId: 'magicCondition' }],
    },

    // allow: string but not the number → only number flags
    {
      code: `if (status === 'active' && retries > 3) run()`,
      options: [{ ignoreStringLiterals: false, allow: ['active'] }],
      errors: [{ messageId: 'magicCondition' }],
    },

    // allow both → no errors? No — this should be valid but we
    // test it to make sure allow works with both types at once
    // (Not possible to put in invalid with 0 errors, so tested in valid above)

    // ignoreStringLiterals: false with allowStructural: false
    {
      code: `if (items.length === 0 && status === 'active') process()`,
      options: [{ ignoreStringLiterals: false, allowStructural: false }],
      errors: [
        { messageId: 'magicCondition' },
        { messageId: 'magicCondition' },
      ],
    },

    // ═══════════════════════════════════════════════
    // EDGE CASES: nested / complex condition structures
    // ═══════════════════════════════════════════════

    // Nested ternary with numbers
    {
      code: `const x = a > 3 ? b > 5 ? 'high' : 'mid' : 'low'`,
      errors: [
        { messageId: 'magicCondition' },
        { messageId: 'magicCondition' },
      ],
    },

    // Number inside logical expression
    {
      code: `if (a > 2 || b > 3) run()`,
      errors: [
        { messageId: 'magicCondition' },
        { messageId: 'magicCondition' },
      ],
    },

    // Number in nested call inside condition
    {
      code: `if (getCount() > 42) process()`,
      errors: [{ messageId: 'magicCondition' }],
    },

    // Computed property key in condition (should still flag the literal)
    {
      code: `if (obj[3]) run()`,
      errors: [{ messageId: 'magicCondition' }],
    },

    // ═══════════════════════════════════════════════
    // EDGE CASES: typeof + ignoreStringLiterals interactions
    // ═══════════════════════════════════════════════

    // typeof comparison ignored (default), but a SEPARATE string literal
    // in the same condition is also ignored (default)
    // → only the number 5 flags
    {
      code: `if (typeof x === 'string' && y === 'admin' && z > 5) run()`,
      errors: [{ messageId: 'magicCondition' }],
    },

    // Same but with ignoreStringLiterals: false → 'admin' flags too
    // typeof still ignored (default ignoreTypeof: true)
    {
      code: `if (typeof x === 'string' && y === 'admin' && z > 5) run()`,
      options: [{ ignoreStringLiterals: false }],
      errors: [
        { messageId: 'magicCondition' },
        { messageId: 'magicCondition' },
      ],
    },

    // Both typeof and strings ignored OFF → all three flag
    {
      code: `if (typeof x === 'string' && y === 'admin' && z > 5) run()`,
      options: [{ ignoreTypeof: false, ignoreStringLiterals: false }],
      errors: [
        { messageId: 'magicCondition' },
        { messageId: 'magicCondition' },
        { messageId: 'magicCondition' },
      ],
    },

    // ═══════════════════════════════════════════════
    // EDGE CASES: template literal interactions
    // ═══════════════════════════════════════════════

    // Dynamic template literal with expression — NOT a static template,
    // falls through to recursive scan. The embedded number flags.
    {
      code: 'if (label === `count-${3}`) run()',
      errors: [{ messageId: 'magicCondition' }],
    },
  ],
})
