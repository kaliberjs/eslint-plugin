const { findVariable } = require('@eslint-community/eslint-utils')
const docsUrl = require('../../../machinery/docsUrl')
const { analyze } = require('../../../machinery/security/taint')
const { report, reportReachableSinks, settings, explainConfidence } = require('../../../machinery/security/finding')

// An outbound request to an attacker-chosen URL turns the server into a
// proxy into its own network: cloud metadata endpoints (169.254.169.254),
// admin services bound to localhost, and `file://` reads. The value that
// matters is the *host* the request lands on — which is why a hostname
// allowlist, not escaping, is the fix, why a proven hostname check clears
// the flow, and why a tainted segment that lands after the authority is
// already fixed is not this weakness at all.

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Detect untrusted input flowing into an outbound HTTP request URL (CWE-918, OWASP A10:2021)',
      url: docsUrl(__dirname),
    },
    messages: {
      ssrf: [
        'Untrusted input reaches {{sink}}, which makes the server request that URL.',
        'Flow: {{flow}}.',
        'Parse the value and check its hostname against a literal allowlist before requesting it, or keep the origin fixed and take only a path segment from input.',
      ].join(' '),
      ssrfQualified: [
        'Untrusted input reaches {{sink}}, which makes the server request that URL.',
        'Flow: {{flow}}.',
        'Confidence is {{confidence}} because the value passes through {{why}}.',
        'Parse the value and check its hostname against a literal allowlist before requesting it, or keep the origin fixed and take only a path segment from input.',
      ].join(' '),
    },
    // No fix and no suggestion: the remediation is an allowlist whose
    // contents only the application knows, not a transformation of the
    // expression at the sink.
    schema: [],
  },

  create(context) {
    const options = settings(context)
    const analysis = analyze(context.sourceCode, options, context.filename)
    const isTainted = node => Boolean(analysis.taintOf(node))

    return {
      CallExpression(node) {
        // The 'url' kind is shared with the two open-redirect rules — this
        // one owns the `ssrf.` sinks and they own the rest, so a single
        // call is never reported twice under two different messages.
        reportReachableSinks(context, analysis, node, 'url', 'ssrf', 'ssrfQualified', reachableFilter)

        const sink = analysis.sinkAt(node)
        if (!isOutboundRequest(sink, node.callee)) return

        const target = node.arguments[sink.argument]

        const taint = target && analysis.taintOf(target)
        if (!taint) return
        if (taint.sanitizedFor.has('url') || taint.sanitizedFor.has('*')) return
        if (!isServerRequest(taint)) return
        if (authorityIsFixed(target, isTainted, makeSubstitute(context.sourceCode))) return

        const label = describeSink(context.sourceCode, node.callee)
        const qualify = taint.confidence < 0.8 && explainConfidence(taint.path)

        report(context, {
          node: target,
          messageId: qualify ? 'ssrfQualified' : 'ssrf',
          data: { sink: label },
          severity: sink.severity,
          confidence: taint.confidence,
          path: [...taint.path, { node, kind: 'sink', label, penalty: 0 }],
        })
      },
    }

    /** Same three questions, asked of a sink found inside a called function's body. */
    function reachableFilter(sink, taint, sinkNode, callArguments) {
      if (!isOutboundRequest(sink, sinkNode.callee)) return false
      if (!isServerRequest(taint)) return false

      // The callee may live in another file, whose AST this analysis
      // instance cannot resolve scopes in — so the authority check, which
      // needs to know which interpolations are tainted, only runs when the
      // sink is one this file's own scope manager knows about.
      const argument = sinkNode.arguments[sink.argument]
      if (!argument || !isOwnNode(context.sourceCode, sinkNode)) return true

      // And inside the callee, `taintOf` is the wrong question: the
      // parameters are unbound there, so every one of them reads as clean.
      // The call-site taint arrives through exactly those parameters —
      // which is the whole premise of reachableSinksOf — so that is what
      // "tainted" means here. `callArguments` (same-file only, one hop) lets
      // a parameter hole be replaced by the actual expression the caller
      // passed, so `fetch(\`${BASE}${path}\`)` inside a wrapper is judged by
      // what `path` really is at the one call site this rule can see, not
      // just "some parameter, so assume the worst".
      return !authorityIsFixed(
        argument,
        node => carriesAParameter(context.sourceCode, node),
        makeSubstitute(context.sourceCode, callArguments)
      )
    }
  },
}

/**
 * A registered outbound-request sink, called in a shape this rule trusts.
 *
 * The receiver constraint is deliberately stricter than the registry's:
 * `this.http.get(path)` and `services.axios.get(path)` match a sink entry
 * by property name, but an injected client under those names (Angular's
 * HttpClient, Nest's HttpService, a test double) takes a *path* against a
 * configured base — not an absolute URL — and reporting SSRF on it is
 * simply wrong. A module namespace is a plain identifier in every real
 * spelling, so requiring one costs nothing.
 */
function isOutboundRequest(sink, callee) {
  if (sink?.requires !== 'url' || !sink.id.startsWith('ssrf.')) return false
  if (!sink.root.method) return true

  return callee.type === 'MemberExpression' && callee.object.type === 'Identifier'
}

/**
 * SSRF is a server-side weakness: the request is made by the server, from
 * inside its network, with its credentials. A browser source can only
 * appear in code running in a browser, where the same fetch is an ordinary
 * cross-origin request the user could have made themselves — subject to
 * CORS, carrying no server-side trust. Reporting it says "the server
 * requests that URL" about a file that has no server in it.
 *
 * The browser-source navigation flows that *are* a weakness belong to
 * security-no-client-side-open-redirect.
 */
function isServerRequest(taint) {
  return !String(taint.source?.id ?? '').startsWith('browser.')
}

/**
 * Does the URL's authority get fixed by static text before any untrusted
 * input reaches it?
 *
 * `fetch(`https://api.example.com/items/${req.params.id}`)` requests
 * api.example.com whatever `id` contains — the host is the weakness, and
 * the host is already decided. This is both the most common non-literal
 * request in any codebase and precisely what this rule's own message
 * recommends, so reporting it would be telling developers their fix is the
 * bug.
 *
 * What stays reported, because the authority is still open:
 *   `https://${req.query.host}/x`      taint before any terminator
 *   `'https://api.example.com' + req.path`  no `/` — `@evil.com` re-hosts it
 *   `${req.query.base}/x`              the base itself is untrusted
 *
 * Not moved into the shared 'url' kind: an unescaped path segment on a
 * fixed origin is still a path-traversal and open-redirect concern, and
 * those rules should keep seeing it. It is only *this* weakness it is not.
 */
function authorityIsFixed(node, isTainted, substitute) {
  // `new URL(path, base)` resolves against the base, so the authority
  // question is entirely about argument 0 — plus the base itself, which
  // decides the host whenever argument 0 turns out to be relative.
  if (isUrlConstruction(node) && node.arguments.length) {
    if (node.arguments[1] && isTainted(node.arguments[1])) return false
    return authorityIsFixed(node.arguments[0], isTainted, substitute)
  }

  // `new URL(path, base).href` and `.toString()` — the authority question
  // is about the construction, not about the read taken off it.
  if (node.type === 'MemberExpression' && isUrlConstruction(node.object)) return authorityIsFixed(node.object, isTainted, substitute)
  if (node.type === 'CallExpression') return authorityIsFixed(node.callee, isTainted, substitute)

  const parts = holeParts(node, substitute)

  // A URL that starts with a single `/` is a path reference: it has no
  // authority of its own and cannot grow one, whatever follows. `'/' + x`
  // is excluded by the second character — that one can become `//evil.com`.
  if (typeof parts[0] === 'string' && /^\/[^/]/.test(parts[0])) return true

  // A scheme, or an untrusted-free leading segment, after which a literal
  // `/`, `?` or `#` ends the authority.
  let base = false
  let closed = false

  for (const part of parts) {
    if (closed) continue

    if (typeof part === 'string') {
      // Two spellings of "the authority starts here", and neither of their
      // slashes is a terminator. `${scheme}://${req.query.host}/x` is the
      // inline one. `${proto}//${req.query.host}/x` — with `proto` chosen
      // from req.secure or x-forwarded-proto, which is ordinary behind a
      // proxy — is the split one, and it is the reason a leading `//` has
      // to open an authority rather than close one: read as a terminator
      // it declared the most direct host injection there is to be safe.
      const scheme = part.indexOf('://')
      const text =
        scheme !== -1 ? part.slice(scheme + 3) :
        part.startsWith('//') ? part.slice(2) :
        part

      if (scheme !== -1 || part.startsWith('//')) base = true
      else if (!base) continue

      if (/[/?#]/.test(text)) closed = true
      continue
    }

    if (isTainted(part)) return false
    base = true
  }

  return closed
}

function isUrlConstruction(node) {
  return node.type === 'NewExpression' && node.callee.type === 'Identifier' && node.callee.name === 'URL'
}

/** A string-building expression as an ordered list of static text and holes. */
function urlParts(node, substitute) {
  if (node.type === 'TemplateLiteral')
    return node.quasis.flatMap((quasi, index) =>
      [quasi.value.cooked ?? quasi.value.raw, ...(node.expressions[index] ? holeParts(node.expressions[index], substitute) : [])]
    )

  if (node.type === 'BinaryExpression' && node.operator === '+')
    return [...holeParts(node.left, substitute), ...holeParts(node.right, substitute)]

  if (node.type === 'Literal' && typeof node.value === 'string') return [node.value]

  return null
}

/**
 * A hole in a string-building expression: itself decomposable (a nested
 * template/`+`/literal) is walked directly; otherwise, if it is an
 * identifier `substitute` can resolve to a concrete expression — a bound
 * call argument, or a same-file `const`'s initializer — walk *that*
 * instead of treating the name as an opaque, unconditionally-tainted
 * value. Falls back to the raw node when nothing resolves, same as before
 * substitution existed.
 */
function holeParts(node, substitute) {
  const decomposed = urlParts(node, substitute)
  if (decomposed) return decomposed

  const resolved = substitute && node.type === 'Identifier' ? substitute(node) : null
  return (resolved && urlParts(resolved, substitute)) || [node]
}

/**
 * Resolves an identifier hole one level: a call-site argument bound
 * through `reachableSinksOf`'s same-file `callArguments` (when known —
 * cross-file and beyond-one-hop leave it unbound), else a same-file
 * `const`'s own initializer. Either way, same file only: the point is to
 * substitute a *node* this analysis can walk, never a value.
 */
function makeSubstitute(sourceCode, callArguments) {
  return node => (callArguments?.has(node.name) ? callArguments.get(node.name) : null) ?? resolveLocalConst(sourceCode, node)
}

function resolveLocalConst(sourceCode, node) {
  const variable = findVariable(sourceCode.getScope(node), node)
  if (variable?.defs.length !== 1) return null

  const [definition] = variable.defs
  if (definition.type !== 'Variable' || definition.parent.kind !== 'const') return null

  return definition.node.init ?? null
}

/**
 * Could this interpolation be the callee's own parameter — the channel the
 * caller's taint arrives through? A `process.env.API_URL` or a module
 * constant could not be. An unresolved identifier could not be either, and
 * that is a fact rather than an assumption: a parameter is declared in the
 * body being walked, so it always resolves. Anything that is not an
 * identifier chain at all (a call, a ternary) is assumed to carry, because
 * guessing "clean" there silently drops a finding.
 */
function carriesAParameter(sourceCode, node) {
  let root = node
  while (root.type === 'MemberExpression') root = root.object
  if (root.type !== 'Identifier') return true

  const variable = findVariable(sourceCode.getScope(root), root)
  return Boolean(variable?.defs.some(definition => definition.type === 'Parameter'))
}

/** Does this node belong to the file being linted, rather than a cross-file callee? */
function isOwnNode(sourceCode, node) {
  let current = node
  while (current.parent) current = current.parent
  return current === sourceCode.ast
}

function describeSink(sourceCode, node) {
  return `${sourceCode.getText(node)}()`
}
