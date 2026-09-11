const { getStaticPropertyName } = require('../../../machinery/ast')
const docsUrl = require('../../../machinery/docsUrl')
const { analyze } = require('../../../machinery/security/taint')
const { reportTaintedValue, taintMessages, settings } = require('../../../machinery/security/finding')

// Elasticsearch's query DSL is a JSON tree, not a call with a fixed sink
// argument, so this rule matches the DSL keys directly (`query_string`,
// `simple_query_string`, `script`) wherever they appear in an object
// literal, then hands the value to the same shared taint analysis every
// other injection rule uses — rather than a registry sink shape built
// around a method+receiver+argument call, which does not fit a value
// nested arbitrarily deep inside a query tree.
//
// The dominant real usage found across every Elasticsearch-backed Kaliber
// project is a shared helper (`@kaliber/elasticsearch`'s query builders)
// that already escapes Lucene reserved characters before constructing
// `query_string` internally — invisible to this rule because it never
// writes the DSL keys in the consumer's own source, which is exactly
// right: this rule exists to catch a *direct* `query_string` /
// `simple_query_string` construction that bypasses that escaping, not to
// re-flag an already-safe pattern.

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Detect untrusted input flowing into an Elasticsearch query_string or a Painless script (CWE-943, CWE-95, OWASP A03:2021-Injection)',
      url: docsUrl(__dirname),
    },
    messages: {
      ...taintMessages(
        'luceneInjection',
        'Possible Elasticsearch injection: untrusted input reaches {{sink}} as a raw Lucene query-syntax string.',
        'Escape Lucene reserved characters, or use a literal-value DSL field (match, term, multi_match) instead of building query syntax from input.',
      ),
      ...taintMessages(
        'scriptInjection',
        'Untrusted input reaches {{sink}}, which Elasticsearch compiles and runs as a Painless script.',
        'There is no safe way to run attacker-influenced code: pass the value through the script\'s `params` instead of building the source string.',
      ),
    },
    // No fix and no suggestion. Rewriting a query_string into an
    // equivalent match/term query, or a script source into params, changes
    // the query's actual matching semantics — not a mechanical
    // transformation, and a wrong "fix" to a security finding is worse
    // than none. See AGENTS.md.
    schema: [],
  },

  create(context) {
    const options = settings(context)
    const analysis = analyze(context.sourceCode, options, context.filename)

    return {
      Property(node) {
        const key = getStaticPropertyName(node)

        if (key === 'query_string' || key === 'simple_query_string') {
          checkProperty(node.value, 'query', 'nosql', 'luceneInjection', 'luceneInjectionQualified', key)
          return
        }

        // Unlike query_string/simple_query_string, `script` is an ordinary
        // English word with an ordinary sub-key (`source`) — the shape of a
        // <script> tag descriptor, a build-step definition, or a
        // code-editor config, none of which have anything to do with
        // Elasticsearch. Requiring recognisable context is what
        // query_string gets for free from its own name; script needs to
        // be told where it lives — either nested under a query-DSL key
        // (`script_score`, `function_score`, ...), or a sibling of a
        // request-root key in the same object (`client.update({ index,
        // id, script })`, `updateByQuery`, `reindex`, `putScript`,
        // ingest-pipeline `processors`), the canonical Elasticsearch
        // client shape for a standalone script call.
        if (key === 'script' && isRecognizableElasticsearchScriptContext(node)) {
          if (node.value.type === 'ObjectExpression') {
            checkProperty(node.value, 'source', 'code', 'scriptInjection', 'scriptInjectionQualified', 'script.source')
            checkProperty(node.value, 'inline', 'code', 'scriptInjection', 'scriptInjectionQualified', 'script.inline')
          } else {
            // Elasticsearch also accepts a script as a bare string, the
            // short form of { source: '<the same string>' }.
            reportIfTainted(node.value, 'code', 'scriptInjection', 'scriptInjectionQualified', 'script')
          }
        }
      },
    }

    function checkProperty(objectNode, propertyName, kind, messageId, qualifiedMessageId, sinkLabel) {
      if (objectNode.type !== 'ObjectExpression') return

      const property = objectNode.properties.find(candidate =>
        candidate.type === 'Property' && getStaticPropertyName(candidate) === propertyName
      )
      if (!property) return

      reportIfTainted(property.value, kind, messageId, qualifiedMessageId, sinkLabel)
    }

    // Severity is fixed at 'high' rather than taken from a sink: the sinks
    // here are query-DSL positions matched structurally, not registry
    // entries that carry their own.
    function reportIfTainted(valueNode, kind, messageId, qualifiedMessageId, sinkLabel) {
      reportTaintedValue(context, analysis, {
        value: valueNode,
        kind,
        label: sinkLabel,
        severity: 'high',
        messageId,
        qualifiedMessageId,
      })
    }
  },
}

// A `script` property nested anywhere under one of these is recognisably
// part of a query DSL tree, not an unrelated object that happens to share
// the name. Not exhaustive of the DSL — just every key a `script` sink
// legitimately sits under in practice (top-level query clauses, aggs,
// function_score, sort, rescore, and the request/body wrapper some client
// call shapes use).
const ES_DSL_ANCESTOR_KEYS = new Set([
  'query', 'aggs', 'aggregations', 'script_score', 'script_fields', '_script',
  'runtime_mappings', 'bool', 'must', 'should', 'filter', 'must_not', 'sort',
  'rescore', 'knn', 'functions', 'function_score', 'nested', 'body', 'request',
  // An ingest pipeline's script sits inside an array element of this —
  // still an ancestor Property, just with an ArrayExpression in between.
  'processors',
])

// A `script` sitting directly in the request options object of
// client.update/updateByQuery/reindex/putScript, alongside one of these,
// is the canonical standalone-script call shape — no query DSL wraps it
// at all in that shape, so the ancestor check alone would miss it.
const ES_REQUEST_ROOT_SIBLING_KEYS = new Set(['index', 'id', 'dest'])

function isRecognizableElasticsearchScriptContext(node) {
  for (let current = node.parent; current; current = current.parent) {
    if (current.type === 'Property' && ES_DSL_ANCESTOR_KEYS.has(String(getStaticPropertyName(current)))) return true
  }

  const container = node.parent
  return container.type === 'ObjectExpression' && container.properties.some(sibling =>
    sibling.type === 'Property' && ES_REQUEST_ROOT_SIBLING_KEYS.has(String(getStaticPropertyName(sibling)))
  )
}
