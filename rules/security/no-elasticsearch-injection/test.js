const { test, merge } = require('../../../machinery/test')

const handler = code => `function handler(req, res) { ${code} }`

test('security-no-elasticsearch-injection', merge(
  {
    // --- the vertical slice, both directions -----------------------------
    valid: [
      // The literal-value DSL fields (match/term/multi_match) are not this
      // rule's concern: Elasticsearch treats the value as data, not query
      // syntax, regardless of what characters it contains.
      handler(`const q = req.query.q; wrappedEsClient.search({ index, request: { query: { match: { title: q } } } })`),
      handler(`const q = req.query.q; wrappedEsClient.search({ index, request: { query: { term: { status: q } } } })`),

      // The shared escaping helper (@kaliber/elasticsearch) builds
      // query_string internally — it never appears as a literal key in
      // this file's own source, so there is nothing here to match. This is
      // the dominant real usage and must stay quiet.
      handler(`const q = req.query.q; wrappedEsClient.search({ index, request: search(['title^3'], q) })`),

      // A static query_string, and a script with a hardcoded source and
      // only a numeric params value.
      "client.search({ query: { query_string: { query: 'title:foo' } } })",
      handler(`client.search({ query: { script_score: { script: { source: "cosineSimilarity(params.query_vector, 'embedding')", params: { query_vector: req.body.vector } } } } })`),
    ],
    invalid: [
      {
        code: handler(`const q = req.query.q; client.search({ query: { query_string: { query: q } } })`),
        errors: [{ messageId: 'luceneInjection' }],
      },
      {
        code: handler(`const q = req.query.q; client.search({ query: { simple_query_string: { query: q } } })`),
        errors: [{ messageId: 'luceneInjection' }],
      },
      {
        code: handler(`client.search({ query: { script_score: { script: { source: 'params.query_vector + ' + req.query.expr } } } })`),
        errors: [{ messageId: 'scriptInjectionQualified' }],
      },
    ],
  },

  {
    // --- nesting depth ------------------------------------------------
    valid: [],
    invalid: [
      {
        // Buried inside a bool/must tree — a real DSL query is rarely flat.
        code: handler(`
          const q = req.query.q
          client.search({
            query: {
              bool: {
                must: [{ query_string: { query: q } }],
                filter: [{ term: { active: true } }],
              },
            },
          })
        `),
        errors: [{ messageId: 'luceneInjection' }],
      },
    ],
  },

  {
    // --- standalone script call shapes: no query DSL wraps them at all ---
    // Confirmed by an adversarial pass to be the canonical real-world
    // shape from Elasticsearch's own docs — a `script` sibling of
    // `index`/`id`/`dest`/`processors` at the request's own root, not
    // nested under `query`/`bool`/etc. Missed by an earlier version of the
    // context check that only looked for a DSL ancestor.
    valid: [
      // Present, but no request-root sibling and no DSL ancestor either —
      // stays outside this rule's recognized context on purpose.
      handler('return { script: { source: req.query.bundle } }'),
    ],
    invalid: [
      {
        code: handler(`client.update({ index: 'users', id: req.params.id, script: { source: 'ctx._source.x = ' + req.body.expr } })`),
        errors: [{ messageId: 'scriptInjectionQualified' }],
      },
      {
        code: handler(`client.updateByQuery({ index: 'users', script: { source: req.body.script }, query: { match_all: {} } })`),
        errors: [{ messageId: 'scriptInjection' }],
      },
      {
        code: handler(`client.reindex({ source: { index: 'a' }, dest: { index: 'b' }, script: { source: 'ctx._source.x = ' + req.query.x } })`),
        errors: [{ messageId: 'scriptInjectionQualified' }],
      },
      {
        code: handler(`client.putScript({ id: 'my-script', script: { source: req.body.source } })`),
        errors: [{ messageId: 'scriptInjection' }],
      },
      {
        // Elasticsearch also accepts a bare-string script, short for
        // { source: '<the same string>' }.
        code: handler(`client.update({ index: 'users', id: req.params.id, script: 'ctx._source.x = ' + req.body.expr })`),
        errors: [{ messageId: 'scriptInjectionQualified' }],
      },
    ],
  },
))
