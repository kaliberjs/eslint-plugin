const { getStaticValue, getPropertyName, findVariable } = require('@eslint-community/eslint-utils')
const { isFunctionNode } = require('../ast')
const registry = require('./registry')

/**
 * Confidence penalties, additive.
 *
 * Additive rather than multiplicative so that *exact* hops cost literally
 * nothing: a twenty-hop chain of `const` aliases stays at full confidence,
 * which is correct, because we are certain about every step. Multiplicative
 * decay would drop a real eight-hop bug below threshold purely for being long.
 *
 * These numbers are engineering judgement, not measurement. Every fixture in
 * the test corpus asserts an exact expected confidence, so changing one shows
 * up as a diff across every affected case and someone has to look at each.
 */
const PENALTY = {
  // exact — the analysis knows precisely what happened
  read: 0,
  destructure: 0,
  sanitize: 0,

  // near-exact — a small modelling assumption
  member: 0.02,
  computedMember: 0.05,
  template: 0.05,
  concat: 0.05,
  methodName: 0.05,

  // branch — one path may be safe
  ternary: 0.08,
  logical: 0.08,

  // flow-insensitivity — we may be reading the wrong write
  multiWrite: 0.15,
}

const cache = new WeakMap()

module.exports = { analyze, PENALTY }

/**
 * The per-file analysis. Cached on the SourceCode, so calling this from fifty
 * rules costs one construction.
 *
 * Invalidation is structural: ESLint builds a new SourceCode for every parse,
 * so every edit and every --fix pass is a natural cache miss. There is
 * deliberately no TTL, no size cap and no invalidate() — anything writable
 * there would be a bug writable there.
 */
function analyze(sourceCode, options) {
  const cached = cache.get(sourceCode)
  if (cached) {
    cached.stats.cacheHits++
    return cached
  }

  const analysis = createAnalysis(sourceCode, options)
  cache.set(sourceCode, analysis)
  return analysis
}

function createAnalysis(sourceCode, options) {
  const known = registry.merge(options.registry)
  const stats = { resolved: 0, cacheHits: 0, bailouts: {} }

  const taintCache = new Map()
  const inProgress = new Set()
  const references = indexReferences(sourceCode)

  return { taintOf, sinkAt, sourceAt, referenceFor, stats }

  function referenceFor(identifier) {
    return references.get(identifier) ?? null
  }

  /** @returns {TaintValue | null} null means untainted *or* unknown, deliberately indistinguishable. */
  function taintOf(node) {
    if (!node) return null
    if (taintCache.has(node)) return taintCache.get(node)
    if (inProgress.has(node)) return null

    inProgress.add(node)
    const result = resolve(node)
    inProgress.delete(node)

    taintCache.set(node, result)
    stats.resolved++
    return result
  }

  function resolve(node) {
    const unwrapped = unwrap(node)

    // Cheapest, highest-precision rejection available: a value we can fold to a
    // constant cannot be tainted. This filters most of the safe cases in one
    // call, including `'a' + 'b'` and template literals with no expressions.
    if (getStaticValue(unwrapped, scopeOf(unwrapped))) return null

    switch (unwrapped.type) {
      case 'Identifier': return resolveIdentifier(unwrapped)
      case 'MemberExpression': return resolveMember(unwrapped)
      case 'TemplateLiteral': return resolveTemplate(unwrapped)
      case 'BinaryExpression': return resolveBinary(unwrapped)
      case 'ConditionalExpression': return resolveConditional(unwrapped)
      case 'LogicalExpression': return resolveLogical(unwrapped)
      case 'CallExpression': return resolveCall(unwrapped)
      case 'TaggedTemplateExpression': return resolveTaggedTemplate(unwrapped)
      default: return null
    }
  }

  // --- sources -------------------------------------------------------------

  function sourceAt(node) {
    if (node.type === 'Identifier') return sourceForIdentifier(node)
    if (node.type === 'MemberExpression') return sourceForMember(node)
    return null
  }

  function sourceForIdentifier(node) {
    const global = known.sources.find(source => !source.path.length && isGlobalNamed(node, source.root.global))
    if (global) return global

    const variable = referenceFor(node)?.resolved
    const parameter = variable?.defs.find(definition => definition.type === 'Parameter')
    if (!parameter) return null

    return known.sources.find(source => !source.path.length && matchesParameter(source, variable, parameter)) ?? null
  }

  /**
   * Is this identifier a reference to the *global* of that name?
   *
   * Not the same question as "does it fail to resolve". A config that declares
   * `globals.browser` gives `location` a real Variable in the global scope with
   * no definitions, so testing for an unresolved reference finds nothing — and
   * silently finding nothing looks exactly like being secure. A shadowing
   * `const location = ...` has a definition, and correctly does not match.
   */
  function isGlobalNamed(identifier, name) {
    if (!name || identifier.type !== 'Identifier' || identifier.name !== name) return false

    const variable = referenceFor(identifier)?.resolved
    if (!variable) return true

    return !variable.defs.length && variable.scope.type === 'global'
  }

  function sourceForMember(node) {
    const { root, path } = memberChain(node)
    if (!root || !path.length) return null

    return known.sources.find(source =>
      source.path.length &&
      source.path.length === path.length &&
      source.path.every((segment, i) => segment === path[i]) &&
      matchesRoot(source, root)
    ) ?? null
  }

  function matchesRoot(source, root) {
    if (root.type !== 'Identifier') return false
    if (isGlobalNamed(root, source.root.global)) return true

    const variable = referenceFor(root)?.resolved
    const parameter = variable?.defs.find(definition => definition.type === 'Parameter')
    return Boolean(parameter && matchesParameter(source, variable, parameter))
  }

  /**
   * The parameter-name heuristic, and the shape constraints that keep it from
   * flagging every `function f(req)` where `req` is a Redis client.
   */
  function matchesParameter(source, variable, definition) {
    const rule = source.root.param
    if (!rule) return false
    if (!rule.name.test(variable.name)) return false

    const fn = definition.node
    if (!isFunctionNode(fn)) return false
    if (fn.params[rule.index] !== definition.name) return false

    const [min, max] = rule.arity ?? []
    if (min !== undefined && (fn.params.length < min || fn.params.length > max)) return false

    return true
  }

  function startTaint(source, node) {
    return {
      source,
      sanitizedFor: new Set(),
      confidence: source.confidence,
      path: [{ node, kind: 'source', label: shortText(node), penalty: 0 }],
    }
  }

  // --- sinks ---------------------------------------------------------------

  function sinkAt(node) {
    if (node.type !== 'CallExpression') return null
    const name = calleeName(node)
    if (!name) return null
    return known.sinks.find(sink => sink.root.method?.test(name)) ?? null
  }

  // --- resolution ----------------------------------------------------------

  function resolveIdentifier(node) {
    const source = sourceForIdentifier(node)
    if (source) return startTaint(source, node)

    const variable = referenceFor(node)?.resolved
    if (!variable) return null

    const definition = variable.defs[0]
    if (!definition) return null

    // A parameter that is not a registered source tells us nothing in phase 1:
    // marking every parameter tainted is the classic way to make a SAST tool
    // unusable.
    if (definition.type === 'Parameter') return null
    if (definition.type === 'ImportBinding') return null

    if (definition.type === 'Variable' && definition.name !== definition.node.id) {
      return resolveDestructured(definition)
    }

    return combineWrites(variable, node)
  }

  function resolveDestructured(definition) {
    const { root, path, paramIndex } = resolvePatternPath(definition.name)

    // A destructured parameter (`function handler({ query })`) has no name for
    // the heuristic to match, so phase 1 cannot see it. Documented limitation.
    if (!root || paramIndex !== undefined) return null

    if (path.some(segment => known.nonPropagatingProperties.includes(segment))) return null

    const rootTaint = taintOf(root)
    if (!rootTaint) {
      // The root is not itself tainted, but root + path may name a source:
      // `const { search } = location`.
      const source = matchSourcePath(root, path)
      return source ? startTaint(source, definition.name) : null
    }

    return hop(rootTaint, {
      node: definition.name,
      kind: 'destructure',
      label: path.join('.'),
      penalty: PENALTY.destructure,
    })
  }

  function matchSourcePath(root, path) {
    return known.sources.find(source =>
      source.path.length === path.length &&
      source.path.every((segment, i) => segment === path[i]) &&
      matchesRoot(source, root)
    ) ?? null
  }

  function combineWrites(variable, node) {
    const writes = variable.references.filter(reference => reference.isWrite() && reference.writeExpr)
    if (!writes.length) return null

    const tainted = writes.map(reference => taintFromWrite(reference, variable)).filter(Boolean)
    if (!tainted.length) return null

    const worst = tainted.reduce(pickWorse)

    // The multi-write penalty prices flow-insensitivity: with several writes we
    // may be reading a value that a later assignment replaced. A compound
    // assignment cannot replace anything — `sql += ' LIMIT 1'` accumulates onto
    // the previous value — so it is not a competing write and must not be
    // charged as one. Without this, the textbook `let sql = '...' + input; sql
    // += '...'` lands at 0.51 and is one small tweak away from being dropped.
    const competing = writes.filter(reference => !reference.isReadWrite())
    const contested = competing.length > 1

    return hop(worst, {
      node,
      kind: contested ? 'multiWrite' : 'read',
      label: variable.name,
      penalty: contested ? PENALTY.multiWrite : PENALTY.read,
    })
  }

  /**
   * For `q += rhs`, Reference.writeExpr is the RHS *only*. Reading "the last
   * write" of `q` therefore yields a bare literal and misses the injection
   * entirely — the single most likely place in this file to introduce a silent
   * false negative. A read-write reference is `previous ⊕ writeExpr`.
   */
  function taintFromWrite(reference, variable) {
    const written = taintOf(reference.writeExpr)
    if (!reference.isReadWrite()) return written

    const previous = previousWriteTaint(reference, variable)
    return pickWorse(written, previous)
  }

  function previousWriteTaint(reference, variable) {
    // ponytail: positional, not loop-correct — `q += x` inside a loop where x
    // becomes tainted on a later iteration is missed. Fails toward a missed
    // finding rather than a false one; needs a CFG to do properly.
    const earlier = variable.references.filter(other =>
      other !== reference &&
      other.isWrite() &&
      other.writeExpr &&
      other.identifier.range[0] < reference.identifier.range[0]
    )

    const tainted = earlier.map(other => taintOf(other.writeExpr)).filter(Boolean)
    return tainted.length ? tainted.reduce(pickWorse) : null
  }

  function resolveMember(node) {
    const source = sourceForMember(node)
    if (source) return startTaint(source, node)

    const name = getPropertyName(node, scopeOf(node))
    if (name && known.nonPropagatingProperties.includes(name)) return null

    const objectTaint = taintOf(node.object)
    if (!objectTaint) return null

    return hop(objectTaint, {
      node,
      kind: name ? 'member' : 'computedMember',
      label: name ? String(name) : '[computed]',
      penalty: name ? PENALTY.member : PENALTY.computedMember,
    })
  }

  function resolveTemplate(node) {
    return worstOf(node.expressions, node, 'template', PENALTY.template)
  }

  function resolveBinary(node) {
    // Only `+` can build an injectable string. Arithmetic yields numbers and
    // comparison yields booleans — a free precision win with no type info.
    if (node.operator !== '+') return null
    return worstOf([node.left, node.right], node, 'concat', PENALTY.concat)
  }

  function resolveConditional(node) {
    return worstOf([node.consequent, node.alternate], node, 'ternary', PENALTY.ternary)
  }

  function resolveLogical(node) {
    // `a && b` evaluates to `a` only when `a` is falsy, and a falsy value
    // reaching a string sink is not exploitable — so only `b` matters.
    const branches = node.operator === '&&' ? [node.right] : [node.left, node.right]
    return worstOf(branches, node, 'logical', PENALTY.logical, node.operator)
  }

  function resolveTaggedTemplate(node) {
    // A tagged template's tag decides everything, and every tag we care about
    // parameterizes its interpolations: `sql`...``, Drizzle's `sql`...``, and
    // `prisma.$queryRaw`...``. That is exactly why Prisma's safe raw APIs are
    // tagged and its unsafe ones take a plain string. So the value a tagged
    // template produces is not a tainted string, and an unknown tag is an
    // unknown call, which is a wall (see resolveCall).
    bail('taggedTemplate')
    return null
  }

  function resolveCall(node) {
    const sanitizer = sanitizerFor(node.callee)
    if (sanitizer) return resolveSanitizerCall(node, sanitizer)

    const propagator = propagatorFor(node)
    if (propagator) return resolvePropagatorCall(node, propagator)

    // An unknown function call breaks the chain. It is a wall, not a penalty:
    // reporting through arbitrary unknown functions is the single largest
    // source of false positives in every tool that does it.
    bail('unknownCall')
    return null
  }

  function resolveSanitizerCall(node, sanitizer) {
    const taint = taintOf(node.arguments[sanitizer.argument])
    if (!taint) return null

    return {
      ...taint,
      sanitizedFor: new Set([...taint.sanitizedFor, ...sanitizer.clears]),
      confidence: Math.min(taint.confidence, sanitizer.confidence ?? 1),
      path: [...taint.path, { node, kind: 'sanitize', label: sanitizer.id, penalty: PENALTY.sanitize }],
    }
  }

  function resolvePropagatorCall(node, propagator) {
    const candidates = []
    if (propagator.receiver) candidates.push(node.callee.object)
    if (propagator.args === 'all') candidates.push(...node.arguments)
    else if (Array.isArray(propagator.args)) candidates.push(...propagator.args.map(i => node.arguments[i]))

    return worstOf(candidates, node, 'methodName', PENALTY.methodName, propagator.method)
  }

  function sanitizerFor(callee) {
    if (callee.type === 'Identifier') {
      // A local named `Number` shadows the global and must not be trusted.
      return known.sanitizers.find(sanitizer => isGlobalNamed(callee, sanitizer.root.global)) ?? null
    }

    if (callee.type === 'MemberExpression') {
      const name = getPropertyName(callee, scopeOf(callee))
      if (!name) return null
      return known.sanitizers.find(sanitizer => sanitizer.root.method?.test(name)) ?? null
    }

    return null
  }

  function propagatorFor(node) {
    if (node.callee.type !== 'MemberExpression') return null
    const name = getPropertyName(node.callee, scopeOf(node.callee))
    if (!name) return null
    return known.propagators.find(propagator => propagator.method === name) ?? null
  }

  // --- helpers -------------------------------------------------------------

  function worstOf(nodes, node, kind, penalty, label = null) {
    const tainted = nodes.map(taintOf).filter(Boolean)
    if (!tainted.length) return null
    return hop(tainted.reduce(pickWorse), { node, kind, label, penalty })
  }

  function hop(taint, step) {
    if (taint.path.length >= options.maxHops) {
      bail('maxHops')
      return null
    }

    return {
      ...taint,
      confidence: Math.max(0, taint.confidence - step.penalty),
      path: [...taint.path, step],
    }
  }

  function scopeOf(node) {
    return sourceCode.getScope(node)
  }

  /**
   * `document.URL` -> { root: <document>, path: ['URL'] }
   *
   * A computed segment we cannot fold makes the whole chain unusable for
   * *source matching* — the path would be wrong rather than merely unknown.
   * Taint still propagates through it via resolveMember's object walk.
   */
  function memberChain(node) {
    const path = []
    let current = node

    while (current.type === 'MemberExpression') {
      const name = getPropertyName(current, scopeOf(current))
      if (name === null) return { root: null, path: [] }
      path.unshift(String(name))
      current = unwrap(current.object)
    }

    return { root: current, path }
  }

  function shortText(node) {
    return sourceCode.getText(node).replace(/\s+/g, ' ').trim()
  }

  function bail(reason) {
    stats.bailouts[reason] = (stats.bailouts[reason] ?? 0) + 1
  }

  function calleeName(node) {
    const { callee } = node
    if (callee.type === 'Identifier') return callee.name
    if (callee.type === 'MemberExpression') {
      const name = getPropertyName(callee, scopeOf(callee))
      return name === null ? null : String(name)
    }
    return null
  }
}

/**
 * For a string built from several tainted parts, the string is only as safe as
 * its *least* sanitised part. One unescaped interpolation ruins the query.
 */
function pickWorse(a, b) {
  if (!a) return b
  if (!b) return a

  const cleanliness = value => value.sanitizedFor.has('*') ? Infinity : value.sanitizedFor.size
  if (cleanliness(a) !== cleanliness(b)) return cleanliness(a) < cleanliness(b) ? a : b

  // Equally sanitised: keep the one we are most confident about, so the report
  // we make is the strongest one available.
  return a.confidence >= b.confidence ? a : b
}

/** Strip wrappers that cannot change the value. */
function unwrap(node) {
  switch (node.type) {
    case 'ChainExpression': return unwrap(node.expression)
    case 'TSAsExpression':
    case 'TSSatisfiesExpression':
    case 'TSTypeAssertion':
    case 'TSNonNullExpression':
    case 'TSInstantiationExpression':
      return unwrap(node.expression)
    case 'AwaitExpression': return unwrap(node.argument)
    case 'SequenceExpression': return unwrap(node.expressions.at(-1))
    default: return node
  }
}

/**
 * Recover the member path a destructured binding came from, by walking up the
 * pattern. Subsumes nested, renamed and defaulted destructuring with no special
 * cases for any of them.
 *
 * `const { query: { id = '0' } } = req` -> { root: <req>, path: ['query', 'id'] }
 */
function resolvePatternPath(identifier) {
  const path = []
  let node = identifier
  let parent = node.parent

  while (parent) {
    if (parent.type === 'AssignmentPattern' && parent.left === node) { /* default value: transparent */ }
    else if (parent.type === 'ObjectPattern') { /* transparent */ }
    else if (parent.type === 'Property' && parent.value === node) path.unshift(String(getPropertyName(parent) ?? '*'))
    else if (parent.type === 'ArrayPattern') path.unshift(String(parent.elements.indexOf(node)))
    else if (parent.type === 'RestElement') path.unshift('...')
    else if (parent.type === 'VariableDeclarator' && parent.id === node) return { root: parent.init, path }
    else if (parent.type === 'AssignmentExpression' && parent.left === node) return { root: parent.right, path }
    else if (isFunctionNode(parent)) return { root: parent, path, paramIndex: parent.params.indexOf(node) }
    else return { root: null, path }

    node = parent
    parent = parent.parent
  }

  return { root: null, path }
}

/** Identifier -> Reference, O(1). Built from arrays ESLint already populated. */
function indexReferences(sourceCode) {
  const index = new Map()

  for (const scope of sourceCode.scopeManager.scopes)
    for (const reference of scope.references)
      index.set(reference.identifier, reference)

  return index
}
