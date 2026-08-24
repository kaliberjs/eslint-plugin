const { getStaticValue, getPropertyName, findVariable } = require('@eslint-community/eslint-utils')
const { isFunctionNode } = require('../ast')
const registry = require('./registry')

/**
 * Confidence penalties, additive.
 *
 * Additive rather than multiplicative so that *exact* hops cost literally
 * nothing: a chain of `const` aliases keeps full confidence, which is correct,
 * because we are certain about every step. Multiplicative decay would drop a
 * real eight-hop bug below threshold purely for being long.
 *
 * The bound on that is `maxHops` (default 12), not the confidence: a chain
 * longer than that is dropped outright regardless of how exact every hop was.
 * So "any number of exact hops is free" is true only up to the hop limit, and
 * the limit is a work bound doing double duty as a correctness cliff.
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

  // flow-insensitivity — we may be reading a write that a later one replaced.
  // Structurally the same uncertainty as a branch (one of several possible
  // values reaches the sink), so priced the same. It was 0.15, which silently
  // dropped the most common way to build a dynamic query in Node:
  // `let where = '1=1'; if (req.query.name) where = '... ' + req.query.name`.
  // That is a complete auth bypass, and stacking 0.15 on two ordinary
  // string-building hops put it under the reporting floor with no output at all.
  multiWrite: 0.08,
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

  return { taintOf, sinkAt, sourceAt, referenceFor, sanitizedAt, stats }

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
      isPrefix(source.path, path) &&
      matchesRoot(source, root)
    ) ?? null
  }

  /**
   * A source path matches any deeper access beneath it: `req.query` being
   * untrusted makes `req.query.filter.name` untrusted too. Requiring an exact
   * length match broke `const { query: { id } } = req` — the destructured form
   * of the same access — and would have made path-qualified sources a false
   * negative rather than a narrowing.
   */
  function isPrefix(prefix, path) {
    return prefix.length <= path.length && prefix.every((segment, i) => segment === path[i])
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
    if (!isFunctionNode(definition.node)) return false

    // `index` and `arity` are optional and unused by the shipped request
    // sources. Gating on the handler signature was simultaneously too strict
    // and too loose: it missed every Express error handler — `(err, req, res,
    // next)`, arity 4 with `req` at index 1 — while still matching unrelated
    // two-argument callbacks. Path qualification discriminates better.
    if (rule.index !== undefined && definition.node.params[rule.index] !== definition.name) return false

    const [min, max] = rule.arity ?? []
    if (min !== undefined && (definition.node.params.length < min || definition.node.params.length > max)) return false

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
    if (node.type !== 'CallExpression' && node.type !== 'MemberExpression') return null

    // Property-target sinks: `el.innerHTML = x`. Matched on the member
    // expression, but only in assignment-target position — *reading*
    // el.innerHTML is harmless and must not match.
    if (node.type === 'MemberExpression') {
      if (node.parent?.type !== 'AssignmentExpression' || node.parent.left !== node) return null

      const name = getPropertyName(node, scopeOf(node))
      if (name === null) return null

      return known.sinks.find(sink => sink.root.property?.test(String(name))) ?? null
    }

    if (node.callee.type === 'Identifier')
      return known.sinks.find(sink => sink.root.module && matchesModuleSink(node.callee, sink.root)) ?? null

    // Method-rooted sinks require a receiver. A bare `query(sql)` or
    // `exec(cmd)` is far more likely to be something else entirely, and a
    // database handle is essentially always a receiver in real code.
    if (node.callee.type !== 'MemberExpression') return null

    const name = getPropertyName(node.callee, scopeOf(node.callee))
    if (name === null) return null

    return known.sinks.find(sink =>
      sink.root.method?.test(String(name)) &&
      (!sink.root.receiver || matchesReceiver(node.callee.object, sink.root.receiver))
    ) ?? null
  }

  /**
   * Module-rooted sinks bind to where the function *came from*, which is
   * tighter than any method-name heuristic can be: `exec` destructured out of
   * child_process is unambiguous in a way a bare `exec(...)` call never is.
   *
   * Three binding shapes are resolved:
   *   import { exec } from 'child_process'
   *   const { exec } = require('child_process')      (also renamed)
   *   const exec = require('child_process').exec
   */
  function matchesModuleSink(identifier, root) {
    const variable = referenceFor(identifier)?.resolved
    const definition = variable?.defs[0]
    if (!definition) return false

    if (definition.type === 'ImportBinding') {
      if (definition.parent.source.value !== root.module) return false

      const imported = definition.node.imported
      const importedName = imported?.type === 'Identifier' ? imported.name : imported?.value
      return root.name.test(String(importedName ?? identifier.name))
    }

    if (definition.type !== 'Variable') return false

    const { module, name } = requiredBy(definition)
    return module === root.module && name !== null && root.name.test(name)
  }

  /** Where does this require()-derived binding get its value? */
  function requiredBy(definition) {
    const declarator = definition.node?.type === 'VariableDeclarator' ? definition.node : null
    if (!declarator || !declarator.init) return {}

    const segments = patternSegments(definition.name, declarator)
    if (segments === null) return {}

    // `const { exec } = require('child_process')` — the export name is the
    // outermost pattern segment; deeper segments would be sub-objects of an
    // export, which is not how these modules are shaped.
    if (segments.length > 0 && isRequireCall(declarator.init))
      return { module: requiredModule(declarator.init), name: segments[0] }

    // `const exec = require('child_process').exec`
    const init = declarator.init
    if (segments.length === 0 && init.type === 'MemberExpression') {
      const base = init.object
      if (!isRequireCall(base)) return {}
      const property = getPropertyName(init, scopeOf(init))
      return property === null ? {} : { module: requiredModule(base), name: String(property) }
    }

    // `const cp = require('child_process')` binds the whole module; its member
    // calls go through the MemberExpression path above and need no entry here.
    return {}
  }

  /**
   * Pattern path from a declarator's binding to this binding's name.
   * `const { a: { b } } = ...` -> ['a', 'b']; flat `const x = ...` -> [].
   */
  function patternSegments(name, declarator) {
    const segments = []
    let current = name

    while (current !== declarator.id) {
      const parent = current?.parent

      if (parent?.type === 'Property' && parent.value === current) {
        segments.unshift(getPropertyName(parent))
      } else if (parent?.type === 'ObjectPattern' || parent?.type === 'ArrayPattern' || parent?.type === 'AssignmentPattern') {
        // Pattern plumbing between the property key and this binding.
      } else {
        return null
      }

      current = parent
    }

    return segments.map(segment => segment === undefined || segment === null ? '*' : String(segment))
  }

  function isRequireCall(node) {
    return node?.type === 'CallExpression'
      && node.callee.type === 'Identifier'
      && node.callee.name === 'require'
      && node.arguments[0]?.type === 'Literal'
  }

  function requiredModule(node) {
    return node.arguments[0].value
  }

  /**
   * Constrain a name-collision-prone sink to plausible receivers. `exec` is the
   * motivating case: `db.exec(sql)` is a SQL sink and `child_process.exec(cmd)`
   * is a shell sink, and reporting the wrong vulnerability class is worse than
   * reporting nothing.
   */
  function matchesReceiver(object, pattern) {
    if (object.type === 'Identifier') return pattern.test(object.name)
    if (object.type === 'MemberExpression') {
      const name = getPropertyName(object, scopeOf(object))
      return name !== null && pattern.test(String(name))
    }
    return false
  }

  // --- resolution ----------------------------------------------------------

  function resolveIdentifier(node) {
    const source = sourceForIdentifier(node)
    if (source) return startTaint(source, node)

    const variable = referenceFor(node)?.resolved
    if (!variable) return null

    const definition = variable.defs[0]
    if (!definition) return null

    // A parameter that is not a registered source tells us nothing about its
    // *incoming* value in phase 1 — marking every parameter tainted is the
    // classic way to make a SAST tool unusable. But an assignment *to* it that
    // we can see is an ordinary write and is followed like any other, which is
    // what catches `req = req.body`.
    if (definition.type === 'Parameter') return combineWrites(variable, node)
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
    return known.sources.find(source => isPrefix(source.path, path) && matchesRoot(source, root)) ?? null
  }

  function combineWrites(variable, node) {
    const writes = variable.references.filter(reference => reference.isWrite() && reference.writeExpr)
    if (!writes.length) return null

    const worst = combine(writes.map(reference => taintFromWrite(reference, variable)))
    if (!worst) return null

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
    return combine([written, previous])
  }

  function previousWriteTaint(reference, variable) {
    // ponytail: positional, not flow-correct. Comparing source positions is not
    // the same as knowing which write executed, so this cuts both ways: it can
    // miss a loop-carried taint (`q += x` where x becomes tainted on a later
    // iteration) *and* it can attribute an earlier write to a compound
    // assignment that a branch never reached. Needs a CFG to do properly.
    const earlier = variable.references.filter(other =>
      other !== reference &&
      other.isWrite() &&
      other.writeExpr &&
      other.identifier.range[0] < reference.identifier.range[0]
    )

    return combine(earlier.map(other => taintOf(other.writeExpr)))
  }

  function resolveMember(node) {
    // Before source matching, not after: with prefix-matching source paths,
    // `req.query.q.length` would otherwise match the `req.query` source and be
    // reported as a tainted string when it is a number.
    const name = getPropertyName(node, scopeOf(node))
    if (name && known.nonPropagatingProperties.includes(name)) return null

    const source = sourceForMember(node)
    if (source) return startTaint(source, node)

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
    if (isAllowlistProven(node)) return null
    return worstOf([node.consequent, node.alternate], node, 'ternary', PENALTY.ternary)
  }

  /**
   * `ALLOWED.includes(v) ? v : fallback` — and the negated, swapped form.
   *
   * The consequent is only evaluated when `v` is a member of `ALLOWED`, so if
   * `ALLOWED` folds to a statically-known collection of primitives the result is
   * provably one of those primitives, whatever `v` came from. That is a proof,
   * not a heuristic, which is the bar this file sets for clearing taint.
   *
   * It matters because this is the canonical *correct* way to write a dynamic
   * `ORDER BY`, the one case parameter binding cannot cover. Reporting it meant
   * rejecting the version developers actually write while staying quiet on the
   * lookup-table version — pushing people away from the safe pattern.
   *
   * Deliberately narrow: only a ternary. The early-return form
   * (`if (!ALLOWED.includes(v)) return`) needs flow sensitivity and remains a
   * documented false positive.
   */
  function isAllowlistProven(node) {
    const test = unwrap(node.test)

    if (test.type === 'UnaryExpression' && test.operator === '!')
      return isMembershipCheckOf(unwrap(test.argument), node.alternate)

    return isMembershipCheckOf(test, node.consequent)
  }

  function isMembershipCheckOf(test, guarded) {
    if (test.type !== 'CallExpression' || test.callee.type !== 'MemberExpression') return false

    const method = getPropertyName(test.callee, scopeOf(test.callee))
    if (method !== 'includes' && method !== 'has') return false

    const [candidate] = test.arguments
    if (!candidate || !guarded) return false

    // Text comparison rather than structural: the guarded expression has to be
    // the *same* expression that was checked, and anything subtler than
    // textual identity is not something we should be claiming to prove.
    if (sourceCode.getText(candidate) !== sourceCode.getText(unwrap(guarded))) return false

    return isPrimitiveCollection(test.callee.object)
  }

  function isPrimitiveCollection(node) {
    const folded = getStaticValue(node, scopeOf(node))
    if (!folded) return false

    const values =
      Array.isArray(folded.value) ? folded.value :
      folded.value instanceof Set ? [...folded.value] :
      null

    return Boolean(values?.length) && values.every(value =>
      value === null || ['string', 'number', 'boolean', 'bigint'].includes(typeof value)
    )
  }

  function resolveLogical(node) {
    // `a && b` evaluates to `a` only when `a` is falsy, and a falsy value
    // reaching a string sink is not exploitable — so only `b` matters.
    const branches = node.operator === '&&' ? [node.right] : [node.left, node.right]
    return worstOf(branches, node, 'logical', PENALTY.logical, node.operator)
  }

  function resolveTaggedTemplate(node) {
    // The tags this rule needs to reason about parameterize their
    // interpolations: `sql`...``, Drizzle's `sql`...``, `prisma.$queryRaw`...``.
    // That is exactly why Prisma's safe raw APIs are tagged and its unsafe ones
    // take a plain string.
    //
    // Not every tag does, though — `String.raw` is plain string building, and a
    // user-defined tag can be anything. Treating an unrecognised tag as an
    // unknown call is the same wall as resolveCall, so the failure is a missed
    // finding rather than a false one, but it is a real miss and it is listed
    // in the rule's documented limitations.
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
      const global = known.sanitizers.find(sanitizer => sanitizer.root.global && isGlobalNamed(callee, sanitizer.root.global))
      if (global) return global

      // Helper-rooted sanitizers: bare calls of a name the consumer
      // explicitly declared trustworthy (`root: { helper: 'i18n' }`). The
      // shape itself records that name-trust was a decision, which is what
      // separates this from the forbidden bare-method matching.
      return known.sanitizers.find(sanitizer =>
        sanitizer.root.helper && helperMatches(sanitizer.root.helper, callee.name)
      ) ?? null
    }

    if (callee.type === 'MemberExpression') {
      const name = getPropertyName(callee, scopeOf(callee))
      if (name === null) return null

      // The receiver constraint is mandatory for method-rooted sanitizers (the
      // registry refuses to load one without it). `escape` is why: lodash, he
      // and validator all export an HTML escaper by that name, and trusting one
      // of those as a SQL escaper turns detection off silently.
      return known.sanitizers.find(sanitizer =>
        matchesPattern(sanitizer.root.method, String(name)) &&
        (!sanitizer.root.receiver || matchesReceiver(callee.object, sanitizer.root.receiver))
      ) ?? null
    }

    return null
  }

  /** Consumer entries may use plain strings where built-ins use regexes. */
  function matchesPattern(pattern, value) {
    if (typeof pattern === 'string') return pattern === value
    return Boolean(pattern?.test(value))
  }

  function propagatorFor(node) {
    // Global functions: String(x), decodeURIComponent(x), JSON.stringify(x).
    // The registry previously had no way to express these at all, so
    // `db.query('… ' + String(req.query.id))` propagated nothing.
    if (node.callee.type === 'Identifier')
      return known.propagators.find(propagator => isGlobalNamed(node.callee, propagator.global)) ?? null

    if (node.callee.type !== 'MemberExpression') return null

    const name = getPropertyName(node.callee, scopeOf(node.callee))
    if (name === null) return null

    return known.propagators.find(propagator => propagator.method === String(name)) ?? null
  }

  /**
   * Has this expression been passed through a registered sanitizer for the
   * kind? Unlike taintOf — which returns null when the *input* was untainted,
   * indistinguishable from "no sanitizer here" — this answers the question
   * matcher-style rules (no-dangerously-set-inner-html) actually need: was a
   * clearing call made, regardless of whether the argument happened to be
   * tainted.
   */
  function sanitizedAt(node, kind) {
    if (node?.type !== 'CallExpression') return false
    const sanitizer = sanitizerFor(node.callee)
    return Boolean(sanitizer && (sanitizer.clears.includes('*') || sanitizer.clears.includes(kind)))
  }

  /** Helper names match by exact string or by regex. */
  function helperMatches(pattern, name) {
    if (!name) return false
    return typeof pattern === 'string' ? pattern === name : pattern.test(name)
  }

  // --- helpers -------------------------------------------------------------

  function worstOf(nodes, node, kind, penalty, label = null) {
    const combined = combine(nodes.map(taintOf))
    if (!combined) return null
    return hop(combined, { node, kind, label, penalty })
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

}

/**
 * Merge several tainted values into the one that reaches the sink.
 *
 * The sanitised kinds are **intersected**, and that is the whole point. Two
 * cases, both requiring it:
 *
 *   string building   `escape(a) + encode(b)` contains both parts, so it is
 *                     safe for a kind only if both parts were made safe for it.
 *   alternatives      `cond ? a : b`, or a variable with several writes — one
 *                     of them reaches the sink and we do not know which, so
 *                     only kinds cleared on *every* path may be assumed.
 *
 * Picking a single "worst" value instead was order-dependent and lost findings:
 * `{sql}` and `{url}` are both size one, so the tiebreak could select the
 * branch already safe for the kind the sink cares about and report nothing.
 * Two semantically identical queries differing only in operand order then gave
 * different answers.
 *
 * Confidence takes the *strongest* candidate: if some path reaches the sink at
 * 0.9 then that path exists, and reporting it lower because another path is
 * vaguer would understate a real finding.
 */
function combine(values) {
  const tainted = values.filter(Boolean)
  if (!tainted.length) return null
  if (tainted.length === 1) return tainted[0]

  const strongest = tainted.reduce((a, b) => a.confidence >= b.confidence ? a : b)
  return { ...strongest, sanitizedFor: intersectKinds(tainted.map(value => value.sanitizedFor)) }
}

/** `'*'` is the universal set, so it never narrows the intersection. */
function intersectKinds(sets) {
  const concrete = sets.filter(set => !set.has('*'))
  if (!concrete.length) return new Set(['*'])

  return concrete.reduce((shared, set) => new Set([...shared].filter(kind => set.has(kind))))
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
