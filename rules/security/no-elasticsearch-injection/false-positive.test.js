const { describe } = require('node:test')
const { test, merge } = require('../../../machinery/test')

/**
 * False-positive corpus for `no-elasticsearch-injection`.
 *
 * Every case here is safe, ordinary code. Two parts:
 *
 *   1. CLEAN — the rule is quiet. Regression tests.
 *   2. WAS FAILING — confirmed by an independent false-positive pass and
 *      fixed before this shipped: `script` is an ordinary English word
 *      with an ordinary `source` sub-key — the shape of a <script> tag
 *      descriptor, a build-step definition, or a code-editor config, none
 *      of which have anything to do with Elasticsearch. Unlike
 *      `query_string`/`simple_query_string`, whose names are specific
 *      enough to Elasticsearch's own DSL vocabulary on their own, `script`
 *      needed an explicit DSL-ancestor requirement before it could be
 *      trusted as a sink.
 */

const handler = code => `function handler(req, res) { ${code} }`

describe('CLEAN — safe code the rule correctly ignores (regression tests)', () => test('security-no-elasticsearch-injection', merge(
  {
    valid: [
      // The dominant real pattern: a shared escaping helper builds
      // query_string internally, invisible in the consumer's own source.
      handler('esClient.search({ index, request: search(["title^3"], req.query.q) })'),
      handler('esClient.search({ query: buildQuery(req.query.q, req.body.extra) })'),

      // Every safe literal-value DSL shape, tainted throughout.
      handler(`client.search({
        query: {
          bool: {
            must: [
              { match: { title: req.query.q } },
              { term: { status: req.query.status } },
              { terms: { tags: req.query.tags } },
              { match_phrase: { body: req.body.phrase } },
              { multi_match: { query: req.query.q, fields: ['title', 'body'] } },
              { range: { createdAt: { gte: req.query.since } } },
              { prefix: { slug: req.query.prefix } },
              { wildcard: { slug: req.query.pattern } },
            ],
          },
        },
        sort: [{ [req.query.sortField]: 'asc' }],
      })`),

      // Static script-source selection, mirroring no-sql-injection's and
      // no-eval's own sanitizer/allowlist corpus for the `code` kind.
      handler(`
        const SCRIPTS = { boost: "doc['boost'].value * 2", decay: "Math.exp(-doc['age'].value)" }
        const source = SCRIPTS[req.query.sort] ?? SCRIPTS.boost
        client.search({ query: { script_score: { script: { source } } } })
      `),
      handler(`
        let source = "doc['boost'].value"
        switch (req.query.sort) {
          case 'decay': source = "Math.exp(-doc['age'].value)"; break
        }
        client.search({ query: { script_score: { script: { source } } } })
      `),

      // Lookalikes: no `script` key at all, or a `query_string` that is a
      // plain string (Sentry/HAR/APM all model it this way), not the
      // { query_string: { query } } DSL shape this rule checks.
      handler('const script = { source: req.query.src }'),
      handler('const { pathname, query_string } = req; res.json({ pathname, query_string })'),
    ],
    invalid: [],
  },

  {
    // --- double-reporting: two independent sinks in one compound query ---
    valid: [],
    invalid: [
      {
        code: handler(`client.search({
          query: {
            bool: {
              must: [{ query_string: { query: req.query.q } }],
              should: [{ function_score: { functions: [{ script_score: { script: { source: 'x' + req.query.boost } } }] } }],
            },
          },
        })`),
        errors: [{ messageId: 'luceneInjection' }, { messageId: 'scriptInjectionQualified' }],
      },
    ],
  },
)))

describe('WAS FAILING — confirmed false positives, now fixed', () => test('security-no-elasticsearch-injection', merge(
  {
    valid: [
      // A <script> tag descriptor for page head management. No
      // Elasticsearch anywhere in the file.
      "export function head() { return [{ script: { source: window.location.origin + '/rum.js', defer: true } }] }",
      // A build/CI step descriptor. There is a real command-injection
      // concern here, but it belongs to a different rule.
      handler(`return { name: 'deploy', script: { source: 'git checkout ' + req.body.branch, shell: 'bash' } }`),
      // A code-editor / syntax-highlight config displaying user-submitted
      // code read-only.
      handler(`return { script: { source: req.body.snippet, language: 'painless', readOnly: true } }`),
      // A fixture/descriptor with no query DSL ancestor at all.
      handler('return { script: { source: req.query.bundle } }'),
    ],
    invalid: [],
  },
)))
