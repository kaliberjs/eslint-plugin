'use strict'

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { ESLint } = require('eslint')
const plugin = require('..')

describe('prose config', () => {
  it('does not report calibrated false positives', async () => {
    const ruleIds = await lintRuleIds(`
      const total = price + tax
      const options = context.options[0] || {}
      const fallbackUser = cachedUser || getUser()

      function isExpired(subscription) {
        return subscription.age > 30
      }

      function hasItems(collection) {
        return collection.length > 0
      }

      function canEdit(user) {
        return user.role === 'admin'
      }

      function render(value, items) {
        if (typeof value === 'string') renderString(value)

        for (let index = 0; index < items.length; index++) {
          renderItem(items[index])
        }
      }

      const selectedUser = isReady(user) && getUser()

      function renderComponent() {
        return <div>{isReady && <Panel />}</div>
      }

      const sum = items.reduce((total, item) => total + item.price, 0)

      setOpen(false)
      expect(value).toBe(false)
      Promise.resolve(false)

      function check(status) {
        if (status === ACTIVE_STATUS) return
      }
    `)

    assert.deepEqual(ruleIds, [])
  })

  it('reports representative prose violations from the preset', async () => {
    const ruleIds = await lintRuleIds(`
      fetchUser(id, true)

      function renderResponse(response) {
        if (!response.data._type) {
          return
        }
      }

      items.filter(item => item.active && !item.archived)

      function renderStatus(retries) {
        if (retries > 3) {
          hideSubscription()
        }
      }


      function processData(data) {
        return data
      }

      function expired(subscription) {
        return subscription.age > 30
      }

      function submit(order) {
        // Validate
        validate(order)
      }

      function isUser(value) {
        return value && value.type === 'user'
      }

      function renderDashboard() {
        return <div>{user.active && !user.suspended && <Panel />}</div>
      }

      const grouped = items.reduce((acc, item) => {
        acc[item.type] = acc[item.type] || []
        acc[item.type].push(item)
        return acc
      }, {})

      function processForm(form) {
        // Check if the form is valid
        if (isValid(form)) submit()
      }
    `)

    assertRuleIdsInclude(ruleIds, [
      '@kaliber/prose-no-boolean-literal-arguments',
      '@kaliber/prose-no-negated-property-chain',
      '@kaliber/prose-prefer-named-array-callback',
      '@kaliber/prose-no-opaque-condition',
      '@kaliber/prose-no-magic-condition',
      '@kaliber/prose-no-generic-function-names',
      '@kaliber/prose-predicate-names',
      '@kaliber/prose-no-section-comments',
      '@kaliber/prose-require-type-predicate-jsdoc',
      '@kaliber/prose-no-opaque-jsx-condition',
      '@kaliber/prose-prefer-named-reducer',
      '@kaliber/prose-no-explanatory-condition-comments',
    ])
  })

  it('proseCore config includes only the low-noise subset', () => {
    const coreRuleNames = Object.keys(plugin.configs.proseCore.rules)
    const expectedRules = [
      '@kaliber/prose-no-boolean-literal-arguments',
      '@kaliber/prose-prefer-named-array-callback',
      '@kaliber/prose-predicate-names',
      '@kaliber/prose-require-type-predicate-jsdoc',
      '@kaliber/prose-no-opaque-jsx-condition',
      '@kaliber/prose-prefer-named-reducer',
    ]

    assert.deepEqual(coreRuleNames.sort(), expectedRules.sort())

    for (const ruleName of coreRuleNames) {
      assert.equal(plugin.configs.proseCore.rules[ruleName], 'warn')
    }
  })

  it('prose config includes all prose rules', () => {
    const proseRuleNames = Object.keys(plugin.configs.prose.rules)
    assert.ok(proseRuleNames.length >= 12, `Expected at least 12 rules, got ${proseRuleNames.length}`)

    for (const ruleName of proseRuleNames) {
      assert.equal(plugin.configs.prose.rules[ruleName], 'warn')
    }
  })
})

async function lintRuleIds(code) {
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: [
      {
        files: ['**/*.js'],
        languageOptions: {
          ecmaVersion: 2022,
          sourceType: 'module',
          parserOptions: {
            ecmaFeatures: {
              jsx: true,
            },
          },
        },
        plugins: {
          '@kaliber': plugin,
        },
        rules: plugin.configs.prose.rules,
      },
    ],
  })

  const [result] = await eslint.lintText(code, { filePath: 'sample.js' })
  return result.messages.map(message => message.ruleId).sort()
}

function assertRuleIdsInclude(actualRuleIds, expectedRuleIds) {
  for (const expectedRuleId of expectedRuleIds) {
    assert.ok(
      actualRuleIds.includes(expectedRuleId),
      `Expected ${expectedRuleId} in ${actualRuleIds.join(', ')}`
    )
  }
}
