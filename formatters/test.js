const { test } = require('node:test')
const assert = require('node:assert/strict')
const formatter = require('./llm')

test('enriches errors with rule description and docs url', () => {
  const results = [
    {
      filePath: '/project/src/components/Hero.js',
      messages: [
        {
          ruleId: '@kaliber/data-x-required',
          severity: 2,
          message: 'Missing required "data-x" attribute on <button> element in page template',
          line: 12,
          column: 5,
        },
        {
          ruleId: '@kaliber/layout-class-name',
          severity: 2,
          message: 'Unexpected attribute "className"',
          line: 18,
          column: 9,
        },
      ],
      errorCount: 2,
      warningCount: 0,
    },
  ]

  const context = {
    rulesMeta: {
      '@kaliber/data-x-required': {
        type: 'problem',
        docs: {
          description: 'Every <a> and <button> must have a data-x tracking attribute',
          url: 'file:///project/node_modules/@kaliber/eslint-plugin/docs/data-x-required.md',
        },
      },
      '@kaliber/layout-class-name': {
        type: 'problem',
        docs: {
          description: 'Components are black boxes — use layoutClassName for positioning instead of className',
          url: 'file:///project/node_modules/@kaliber/eslint-plugin/docs/layout-class-name.md',
        },
      },
    },
  }

  const output = formatter(results, context)

  // Verify file path is shown
  assert.ok(output.includes('/project/src/components/Hero.js'), 'should include file path')

  // Verify standard error lines
  assert.ok(output.includes('12:5  error'), 'should include line:col and severity')
  assert.ok(output.includes('Missing required "data-x"'), 'should include error message')

  // Verify enrichment — descriptions
  assert.ok(
    output.includes('→ Every <a> and <button> must have a data-x tracking attribute'),
    'should include data-x-required description'
  )
  assert.ok(
    output.includes('→ Components are black boxes'),
    'should include layout-class-name description'
  )

  // Verify enrichment — docs URLs
  assert.ok(
    output.includes('→ file:///project/node_modules/@kaliber/eslint-plugin/docs/data-x-required.md'),
    'should include docs URL'
  )

  // Verify summary
  assert.ok(output.includes('✖ 2 problems (2 errors, 0 warnings)'), 'should include summary')
})

test('skips enrichment for rules without meta.docs', () => {
  const results = [
    {
      filePath: '/project/src/index.js',
      messages: [
        { ruleId: 'no-unused-vars', severity: 1, message: "'x' is defined but never used", line: 1, column: 7 },
      ],
      errorCount: 0,
      warningCount: 1,
    },
  ]

  const context = {
    rulesMeta: {
      'no-unused-vars': { type: 'problem' },
    },
  }

  const output = formatter(results, context)

  assert.ok(output.includes("'x' is defined but never used"), 'should include message')
  assert.ok(!output.includes('→'), 'should not include enrichment arrow')
})

test('returns empty string for clean files', () => {
  const results = [
    { filePath: '/project/src/clean.js', messages: [], errorCount: 0, warningCount: 0 },
  ]

  const output = formatter(results, { rulesMeta: {} })
  assert.equal(output, '')
})
