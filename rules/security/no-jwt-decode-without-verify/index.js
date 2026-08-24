const { findVariable } = require('@eslint-community/eslint-utils')
const docsUrl = require('../../../machinery/docsUrl')
const { report } = require('../../../machinery/security/finding')

// `jwt.decode()` (jsonwebtoken), `jwtDecode()` (jwt-decode) and jose's
// `decodeJwt` / `decodeProtectedHeader` parse the payload without checking
// the signature. The rule cannot see whether the claims are then used for
// authentication or merely to decide when to refresh a token, so it reports
// every decode at medium confidence and leaves that judgement to the reader.
// The bare-name forms only exist in JWT libraries, so name matching carries
// no realistic false-positive burden on the call itself.
const DECODE_NAMES = new Set(['jwtDecode', 'decodeJwt', 'decodeProtectedHeader'])

// Object roots whose `.decode()` means JWT decoding. Note that
// 'jsonwebtoken' does not contain the substring 'jwt' (json-web-token),
// so it is listed explicitly.
const JWT_ROOTS = /^(jwt|jsonwebtoken|jws|jose)/i

// Modules a bare `decode` identifier may be destructured or imported from.
// 'decode' alone is too generic to match by name (codecs, buffers, query
// parsers all export one) — it only counts once it is proven to come from
// here, the same proof no-jwt-algorithm-confusion requires for bare `verify`.
const JWT_MODULES = /^(jsonwebtoken|jose|jws)$/

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Do not trust claims from a decoded-but-unverified JWT (CWE-347)',
      url: docsUrl(__dirname),
    },
    messages: {
      decodeWithoutVerify: [
        '{{ callee }} parses the token without verifying its signature.',
        'The payload is attacker-authored JSON until jwt.verify() / jwtVerify() has checked it.',
        'If the claims are used for authentication or authorization, verify first; if this is refresh timing, logging, or kid selection, the use is legitimate.',
      ].join(' '),
    },
    // No fix: the correct action depends on what the claims are used for.
    schema: [],
  },

  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee

        // Member form: `jwt.decode(...)`, matched on an object whose name is
        // a known JWT library root. Matching every `.decode()` would fire on
        // codecs, TextDecoders and query parsers that have nothing to do
        // with JWTs.
        if (
          callee.type === 'MemberExpression'
          && !callee.computed
          && callee.property.name === 'decode'
          && callee.object.type === 'Identifier'
          && JWT_ROOTS.test(callee.object.name)
        ) {
          report(context, { node, messageId: 'decodeWithoutVerify', data: { callee: sourceText(context, callee) }, severity: 'high', confidence: 0.6 })
          return
        }

        if (callee.type !== 'Identifier') return

        if (DECODE_NAMES.has(callee.name)) {
          report(context, { node, messageId: 'decodeWithoutVerify', data: { callee: callee.name }, severity: 'high', confidence: 0.6 })
          return
        }

        // const { decode } = require('jsonwebtoken') — or renamed:
        // const { decode: d } = require('jsonwebtoken'); d(token). 'decode'
        // by itself is too generic to match by name, so it only counts once
        // proven to be the JWT module's export, regardless of local rename.
        if (importedName(context, callee) === 'decode') {
          report(context, { node, messageId: 'decodeWithoutVerify', data: { callee: callee.name }, severity: 'high', confidence: 0.6 })
        }
      },
    }
  },
}

function sourceText(context, node) {
  return context.sourceCode.getText(node)
}

/** The name this identifier was imported/destructured as from a JWT module, or null. */
function importedName(context, identifier) {
  const variable = findVariable(context.sourceCode.getScope(identifier), identifier)
  const definition = variable?.defs[0]
  if (!definition) return null

  if (definition.type === 'ImportBinding') {
    if (!JWT_MODULES.test(String(definition.parent.source.value))) return null
    const imported = definition.node.imported
    return imported?.type === 'Identifier' ? imported.name : (imported?.value ?? null)
  }

  if (definition.type === 'Variable') {
    const init = definition.node.init
    const isRequireOfJwtModule = init?.type === 'CallExpression'
      && init.callee?.type === 'Identifier' && init.callee.name === 'require'
      && init.arguments[0]?.type === 'Literal'
      && JWT_MODULES.test(String(init.arguments[0].value))
    if (!isRequireOfJwtModule) return null

    // Only the destructured form (`const { decode } = require(...)`) names
    // an export; `const jwt = require(...)` binds the whole module and is
    // handled by the member-form branch above, not here.
    const property = definition.name.parent
    if (property?.type !== 'Property') return null
    if (property.key?.type === 'Identifier') return property.key.name
    return property.key?.type === 'Literal' ? String(property.key.value) : null
  }

  return null
}
