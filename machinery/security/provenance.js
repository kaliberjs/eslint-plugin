const { getPropertyName } = require('@eslint-community/eslint-utils')
const { referenceFor, unwrap } = require('./expression')
const { requiredBy, isRequireCall } = require('./registry-pattern')
const { getCalleeName } = require('../ast')

/**
 * Where a callee came from, resolved through the scope rather than guessed
 * from its name.
 *
 * A security rule that matches `createHash(...)` or `jwt.verify(...)` by name
 * is really asserting something about a library it never proved was there. It
 * is the cheapest false positive in the set — a local helper, a test double,
 * a KMS client, an ORM — and the cheapest evasion, because renaming the
 * import defeats it. Three rules had each grown their own copy of this walk
 * (`isCryptoBinding`, `isTarBinding`, `isFromJwtModule`) and they had already
 * drifted in which binding shapes they resolved.
 *
 * Rules that cannot gate on provenance — a CDN global, a `<script>`-tag
 * library, a value handed in as a parameter — belong in `security-audit` with
 * their confidence capped, not in the baseline.
 */
/**
 * What a name-only match is worth. Medium, by definition: the analysis knows
 * what the call is *called* and nothing about where it came from. High
 * confidence is reserved for a resolved binding, and the severity matrix in
 * finding.js keeps medium-confidence findings out of `error`.
 */
const NAME_ONLY_CONFIDENCE = 0.7

module.exports = { apiProvenance, importedFrom, calleeApi, bareSpecifier, NAME_ONLY_CONFIDENCE }

/**
 * `{ module, name }` for a callee, or null when nothing in this file proves
 * an origin. `module` is the specifier with any `node:` prefix removed;
 * `name` is the *export's* own name, so a rename is seen through:
 *
 *   import { createHash } from 'node:crypto'        -> { crypto, createHash }
 *   import { createHash as h } from 'crypto'        -> { crypto, createHash }
 *   import crypto from 'crypto'                     -> { crypto, default }
 *   import * as crypto from 'crypto'                -> { crypto, * }
 *   const { createHash: h } = require('crypto')     -> { crypto, createHash }
 *   const h = require('crypto').createHash          -> { crypto, createHash }
 *   crypto.createHash  (crypto = require('crypto')) -> { crypto, createHash }
 *   require('crypto').createHash                    -> { crypto, createHash }
 */
function apiProvenance(sourceCode, node) {
  const callee = unwrap(node)

  if (callee.type === 'Identifier') return bindingOrigin(sourceCode, callee)

  if (callee.type === 'MemberExpression') {
    const name = getPropertyName(callee, sourceCode.getScope(callee))
    if (name === null) return null

    const module = moduleObjectOf(sourceCode, unwrap(callee.object))
    return module === null ? null : { module, name: String(name) }
  }

  return null
}

/**
 * The API a callee names and whether the module behind it was proven:
 * `{ name, proven }`, or null when there is no name to match at all.
 *
 * For the library families that also ship as a `<script>` tag or a CDN global
 * — crypto-js is the one in this repo — there is no import to resolve and a
 * name match is all there is. Those findings are still worth making; they are
 * worth making at `NAME_ONLY_CONFIDENCE`, in the audit preset, with the rule's
 * readme saying so.
 */
function calleeApi(sourceCode, callee, pattern) {
  const imported = importedFrom(sourceCode, callee, pattern)
  if (imported) return { name: imported, proven: true }

  const name = getCalleeName(callee)
  return name ? { name, proven: false } : null
}

/** The export name this callee has inside a module matching `pattern`, or null. */
function importedFrom(sourceCode, callee, pattern) {
  const origin = apiProvenance(sourceCode, callee)
  return origin && pattern.test(origin.module) ? origin.name : null
}

function bindingOrigin(sourceCode, identifier) {
  const definition = referenceFor(sourceCode, identifier)?.resolved?.defs[0]
  if (!definition) return null

  if (definition.type === 'ImportBinding') {
    const module = bareSpecifier(definition.parent.source.value)
    const specifier = definition.node

    if (specifier.type === 'ImportDefaultSpecifier') return { module, name: 'default' }
    if (specifier.type === 'ImportNamespaceSpecifier') return { module, name: '*' }

    const imported = specifier.imported
    const name = imported?.type === 'Identifier' ? imported.name : imported?.value
    return { module, name: String(name ?? identifier.name) }
  }

  if (definition.type !== 'Variable') return null

  // Destructured or member-accessed require: registry entries already needed
  // exactly this walk, so it lives with them.
  const { module, name } = requiredBy(sourceCode, definition)
  if (module != null && name != null) return { module: bareSpecifier(module), name: String(name) }

  // `const crypto = require('crypto')` — the whole module under one name.
  const whole = requireSpecifier(definition.node.init)
  return whole === null ? null : { module: whole, name: '*' }
}

/**
 * Which module *is* this expression, for the receiver of a member call.
 * A named import binds one export, and that export's properties are the
 * function's own (`createHash.name`), not the module's — so only the
 * namespace, default-interop and whole-require shapes answer here.
 */
function moduleObjectOf(sourceCode, node) {
  const required = requireSpecifier(node)
  if (required !== null) return required

  if (node.type !== 'Identifier') return null

  const origin = bindingOrigin(sourceCode, node)
  if (!origin) return null
  return origin.name === '*' || origin.name === 'default' ? origin.module : null
}

function requireSpecifier(node) {
  return isRequireCall(node) ? bareSpecifier(node.arguments[0].value) : null
}

/** `node:crypto` and `crypto` are the same module; callers should not have to spell both. */
function bareSpecifier(value) {
  return String(value).replace(/^node:/, '')
}
