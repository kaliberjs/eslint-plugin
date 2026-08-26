const { getStaticValue, getPropertyName } = require('@eslint-community/eslint-utils')
const { isFunctionNode } = require('../ast')
const { referenceFor, isGlobalConstructorNamed, unwrap } = require('./expression')

// URL properties that identify *where a request goes*. A membership check
// against one of these proves the origin of the value it was read from.
const URL_HOST_PROPERTIES = ['hostname', 'host', 'origin']

/**
 * Flow sensitivity, in the shapes this file can *prove* without a CFG.
 * A proven guard clears taint outright, so the bar here is proof rather
 * than heuristic — every function below either establishes textual identity
 * with the guarded expression or refuses to answer.
 *
 * `isTainted` is injected rather than imported: a containment check only
 * proves anything when the prefix it compares against is itself untrusted,
 * which is the one question here the resolver has to answer. Everything
 * else needs only the SourceCode.
 */
module.exports = { isFlowGuarded, isAllowlistProven }


/**
 * Two guard shapes are proven, both requiring textual identity with the
 * guarded expression:
 *
 *   if (TABLES.includes(t)) { ...t... }        // positive, inside consequent
 *   if (!TABLES.includes(t)) return; ...t...   // negative, abrupt consequent
 *
 * checkOf decides what "proven" means for the guard's test expression —
 * allowlist membership against a foldable primitive collection, or
 * path-containment against an unqualified prefix. The else branch of
 * neither shape is proven, guards do not cross function boundaries, and
 * anything but an abrupt negative-consequent keeps nothing: falling
 * through an `if` whose body merely logs would prove nothing.
 */
function isGuardProven(node, checkOf) {
  let current = node

  while (current.parent) {
    const parent = current.parent

    if (parent.type === 'IfStatement' && parent.consequent === current) {
      if (checkOf(parent.test, node)) return true
    }

    if (parent.type === 'BlockStatement') {
      const index = parent.body.indexOf(current)
      for (let i = index - 1; i >= 0; i--) {
        const statement = parent.body[i]
        if (statement.type !== 'IfStatement' || statement.alternate) continue
        const argument = negateTest(statement.test)
        if (!argument || !checkOf(argument, node)) continue
        if (isAbruptConsequent(statement.consequent)) return true
      }
    }

    // Guards live inside one function; do not climb past its boundary.
    // The boundary check comes after the BlockStatement handling above so
    // that a function's own body block still gets scanned.
    if (isFunctionNode(parent)) break

    current = parent
  }

  return false
}

function isFlowGuarded(sourceCode, node, isTainted) {
  return (
    isGuardProven(node, (test, guarded) => isMembershipCheckOf(sourceCode, test, guarded)) ||
    isGuardProven(node, (test, guarded) => isContainmentCheckOf(sourceCode, test, guarded, isTainted))
  )
}

function negateTest(test) {
  if (test?.type !== 'UnaryExpression' || test.operator !== '!') return null
  return test.argument
}

function isAbruptConsequent(statement) {
  if (statement.type === 'BlockStatement')
    return statement.body.every(s => s.type === 'ReturnStatement' || s.type === 'ThrowStatement')
  return statement.type === 'ReturnStatement' || statement.type === 'ThrowStatement'
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
function isAllowlistProven(sourceCode, node) {
  const test = unwrap(node.test)

  if (test.type === 'UnaryExpression' && test.operator === '!')
    return isMembershipCheckOf(sourceCode, unwrap(test.argument), node.alternate)

  return isMembershipCheckOf(sourceCode, test, node.consequent)
}

function isMembershipCheckOf(sourceCode, test, guarded) {
  if (test.type !== 'CallExpression' || test.callee.type !== 'MemberExpression') return false

  const method = getPropertyName(test.callee, sourceCode.getScope(test.callee))
  if (method !== 'includes' && method !== 'has') return false

  const [candidate] = test.arguments
  if (!candidate || !guarded) return false

  // Text comparison rather than structural: the guarded expression has to be
  // the *same* expression that was checked, and anything subtler than
  // textual identity is not something we should be claiming to prove.
  const guardedText = sourceCode.getText(unwrap(guarded))
  const proven = sourceCode.getText(candidate) === guardedText || hostCheckTarget(sourceCode, unwrap(candidate)) === guardedText
  if (!proven) return false

  return isPrimitiveCollection(sourceCode, test.callee.object)
}

/**
 * The other half of a membership check: the allowlist may hold *hosts*
 * rather than whole values, which is what the SSRF and open-redirect
 * remediations actually recommend — `ALLOWED_HOSTS.includes(new
 * URL(input).hostname)`, and then request or redirect to `input`.
 *
 * The object read from must be *provably a parsed URL*, and that
 * restriction is load-bearing rather than defensive. Accepting any
 * `x.host` made a check on one property clear the whole object, and with
 * it every sibling: `if (!ALLOWED.includes(q.host)) return` would have
 * silenced `fetch(q.url)` — and, since guards clear every kind at once,
 * `db.query('… ' + q.name)` in the same function. A membership test on a
 * request property proves something about that property alone.
 *
 * Known imprecision, recorded rather than modelled: this proves the host
 * of the value, not the whole value, while a proven guard clears taint
 * for every kind at once. A host-allowlisted URL string interpolated into
 * SQL is therefore a false negative. Reporting the documented fix for the
 * two rules that most need one costs considerably more than that.
 *
 * @returns text of the expression whose host was proven, or null.
 */
function hostCheckTarget(sourceCode, candidate) {
  if (candidate.type !== 'MemberExpression') return null

  const property = getPropertyName(candidate, sourceCode.getScope(candidate))
  if (!URL_HOST_PROPERTIES.includes(property)) return null

  const object = unwrap(candidate.object)

  // `new URL(input).hostname` proves input's host only when input is the
  // whole URL. Given a base argument the host may come from the base
  // instead, and `new URL('//evil.com', base).hostname` is evil.com.
  if (isUrlConstruction(sourceCode, object))
    return object.arguments.length === 1 ? sourceCode.getText(object.arguments[0]) : null

  // `const target = new URL(input)` … `ALLOWED.includes(target.hostname)`
  // — the same proof one binding removed, which is how it is written.
  return isUrlBinding(sourceCode, object) ? sourceCode.getText(object) : null
}

function isUrlConstruction(sourceCode, node) {
  return node.type === 'NewExpression' && isGlobalConstructorNamed(sourceCode, node.callee, /^URL$/)
}

/** An identifier whose only definition initialises it from `new URL(...)`. */
function isUrlBinding(sourceCode, node) {
  if (node.type !== 'Identifier') return false

  const variable = referenceFor(sourceCode, node)?.resolved
  if (variable?.defs.length !== 1) return false

  const [definition] = variable.defs
  if (definition.type !== 'Variable' || !definition.node.init) return false

  return isUrlConstruction(sourceCode, unwrap(definition.node.init))
}

/**
 * The path-traversal remediation this file's own rule recommends:
 * `resolved.startsWith(base + path.sep)`. The guarded expression must be
 * the *receiver* here, not an argument — `resolved.startsWith(x)`, not
 * `x.startsWith(resolved)` — and the prefix must itself be untainted, or
 * an attacker picks a path that starts with their own chosen prefix and
 * the check proves nothing.
 */
function isContainmentCheckOf(sourceCode, test, guarded, isTainted) {
  if (test.type !== 'CallExpression' || test.callee.type !== 'MemberExpression') return false

  const method = getPropertyName(test.callee, sourceCode.getScope(test.callee))
  if (method !== 'startsWith') return false

  if (!guarded || sourceCode.getText(test.callee.object) !== sourceCode.getText(unwrap(guarded))) return false

  const [prefix] = test.arguments
  return Boolean(prefix) && !isTainted(prefix)
}

function isPrimitiveCollection(sourceCode, node) {
  const folded = getStaticValue(node, sourceCode.getScope(node))
  if (!folded) return false

  const values =
    Array.isArray(folded.value) ? folded.value :
    folded.value instanceof Set ? [...folded.value] :
    null

  return Boolean(values?.length) && values.every(value =>
    value === null || ['string', 'number', 'boolean', 'bigint'].includes(typeof value)
  )
}
