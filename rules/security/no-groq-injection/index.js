const docsUrl = require('../../../machinery/docsUrl')
const { analyze } = require('../../../machinery/security/taint')
const { reportReachableSinks, reportTaintedValue, taintMessages, callLabel, settings } = require('../../../machinery/security/finding')

// GROQ (Sanity's query language) is addressed the same way SQL is: a query
// string built with untrusted input lets an attacker change the structure
// of the query, not just its values. The `groq` template tag is a verified
// no-op (see machinery/security/taint.js#resolveTaggedTemplate) — it exists
// for editor syntax highlighting, not parameterization — so a groq-tagged
// query is exactly as injectable as the same interpolations in a plain
// template literal.

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Detect untrusted input flowing into a raw GROQ query (CWE-943, OWASP A03:2021-Injection)',
      url: docsUrl(__dirname),
    },
    messages: taintMessages(
      'groqInjection',
      'Possible GROQ injection: untrusted input reaches {{sink}} as part of the query string.',
      'Use a $parameter placeholder and pass the value in the second argument instead.',
    ),
    // No fix and no suggestion. Rewriting an interpolated query into a
    // parameterized one changes the query text (`$name` placeholder) and
    // the call's argument list — not a mechanical transformation, and a
    // wrong "fix" to a security finding is worse than none. See AGENTS.md.
    schema: [],
  },

  create(context) {
    const options = settings(context)
    const analysis = analyze(context.sourceCode, options, context.filename)

    return {
      CallExpression(node) {
        reportReachableSinks(context, analysis, node, 'nosql', 'groqInjection', 'groqInjectionQualified',
          (sink, taint, sinkNode) => hasGroqSyntaxHint(sinkNode.arguments[sink.argument], taint.path))

        const sink = analysis.sinkAt(node)
        if (sink?.requires !== 'nosql') return

        const query = node.arguments[sink.argument]

        // A parameterized call leaves the query argument untainted, so
        // `client.fetch('*[slug.current == $slug]', { slug })` needs no
        // special case: the taint is in argument 1, and argument 1 is not
        // the sink.
        const taint = query && analysis.taintOf(query)
        if (!taint) return

        // `client`/`fetch` are the two most generic identifiers in the
        // receiver+method vocabulary this registry uses — unlike a SQL
        // handle, an ordinary HTTP or API client wrapper is routinely named
        // and shaped exactly like this ("client.fetch(url)"), and the
        // receiver name a project actually uses for its real Sanity client
        // (bare `client`) cannot be dropped without losing the common case.
        // Require some static evidence that the query text is actually
        // GROQ before trusting the sink match; a query built with no static
        // text at all (the whole thing is the tainted value) is the worst
        // case, not a safe one, so it is never excused by this check.
        if (!hasGroqSyntaxHint(query, taint.path)) return

        reportTaintedValue(context, analysis, {
          value: query,
          kind: 'nosql',
          sink,
          label: callLabel(context.sourceCode, node),
          messageId: 'groqInjection',
          qualifiedMessageId: 'groqInjectionQualified',
        })
      },
    }
  },
}

const GROQ_SYNTAX = /\*\s*\[|\b_type\b|\b_id\b|->|\|\s*order\b|\bdefined\(|\breferences\(|\bcount\(/

/**
 * True when the query's own static text, or any hop the taint took to
 * reach it, contains recognizable GROQ syntax; when any of those nodes was
 * itself wrapped in the `groq` tag (nobody reaches for that tag by
 * accident, even with no keyword in the specific fragment at hand — a
 * multi-write query builder's *earlier*, untainted write is exactly this
 * shape, and the combined taint's path keeps only the tainted write); or
 * when there is no static text anywhere to check at all, which means the
 * entire query came from the tainted value and is the most dangerous
 * shape, not a safe one.
 */
function hasGroqSyntaxHint(query, path) {
  const nodes = [query, ...path.map(hop => hop.node)].filter(Boolean)
  if (nodes.some(isGroqTaggedTemplate)) return true

  const texts = []
  for (const node of nodes) collectStaticText(node, texts)
  if (!texts.length) return true
  return texts.some(text => GROQ_SYNTAX.test(text))
}

function isGroqTaggedTemplate(node) {
  return node.type === 'TaggedTemplateExpression' && node.tag.type === 'Identifier' && node.tag.name === 'groq'
}

function collectStaticText(node, texts) {
  if (!node) return
  if (node.type === 'TaggedTemplateExpression') return collectStaticText(node.quasi, texts)
  if (node.type === 'TemplateLiteral') {
    for (const quasi of node.quasis) if (quasi.value.cooked) texts.push(quasi.value.cooked)
    return
  }
  if (node.type === 'Literal' && typeof node.value === 'string') return void texts.push(node.value)
  if (node.type === 'BinaryExpression') {
    collectStaticText(node.left, texts)
    collectStaticText(node.right, texts)
  }
}
