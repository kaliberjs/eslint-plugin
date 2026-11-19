module.exports = {
  isStaticExpression,
  getImportAccessPath,
  getCalleePropertyChain,
  isSecuritySensitiveName,
  findImportedName,
  findVariableInScope,
  isLiteral,
}

const SECURITY_KEYWORDS = [
  'password', 'passwd', 'secret', 'api_key', 'apikey', 'api-key',
  'token', 'auth', 'pass', 'hash', 'credential', 'private_key',
  'privatekey', 'access_token', 'accesstoken', 'refresh_token',
]

const SECURITY_KEYWORD_RE = new RegExp(
  `(${SECURITY_KEYWORDS.join('|')})`,
  'i'
)

const PATH_PACKAGE_NAMES = ['path', 'node:path', 'path/posix', 'node:path/posix']
const URL_PACKAGE_NAMES = ['url', 'node:url']
const PATH_METHODS = new Set(['basename', 'dirname', 'extname', 'join', 'normalize', 'relative', 'resolve', 'toNamespacedPath'])
const PATH_STATIC_MEMBERS = new Set(['delimiter', 'sep'])
const IMPORT_META_PROPS = new Set(['url', 'dirname', 'filename'])

/**
 * Check if an AST node represents a static (safe) expression.
 * Scope-aware: follows const variable references, recognizes path.resolve(),
 * process.cwd(), require.resolve(), url.fileURLToPath(), import.meta.*.
 *
 * @param {object} node - AST node to check
 * @param {object} [scope] - ESLint scope (enables deep analysis when provided)
 */
function isStaticExpression(node, scope) {
  const tracked = new Set()
  return isStatic(node)

  function isStatic(node) {
    if (!node) return false
    if (tracked.has(node)) return false
    tracked.add(node)

    switch (node.type) {
      case 'Literal':
        return true

      case 'TemplateLiteral':
        return scope
          ? node.expressions.every(isStatic)
          : node.expressions.length === 0

      case 'BinaryExpression':
        return isStatic(node.left) && isStatic(node.right)

      case 'Identifier':
        if (node.name === '__dirname' || node.name === '__filename') return true
        if (!scope) return false
        return isStaticVariable(node)

      case 'MemberExpression':
        return isStaticImportMeta(node) || isStaticPathMember(node)

      case 'CallExpression':
        return isStaticPathCall(node) || isStaticFileURLToPath(node) || isStaticRequireResolve(node) || isStaticCwd(node)

      default:
        return false
    }
  }

  /** Variable is static if it's const-like, has one def, and init is static */
  function isStaticVariable(node) {
    const variable = findVariableInScope(scope, node.name)
    if (!variable) return false

    if (variable.defs.length === 0) {
      return node.name === '__dirname' || node.name === '__filename'
    }

    if (variable.defs.length === 1) {
      const def = variable.defs[0]
      if (
        def.type === 'Variable' &&
        def.node.init &&
        variable.references.every(ref => ref.isReadOnly() || ref.identifier === def.name)
      ) {
        return isStatic(def.node.init)
      }
    }
    return false
  }

  /** import.meta.url / import.meta.dirname / import.meta.filename */
  function isStaticImportMeta(node) {
    return (
      node.type === 'MemberExpression' &&
      !node.computed &&
      node.property.type === 'Identifier' &&
      IMPORT_META_PROPS.has(node.property.name) &&
      node.object.type === 'MetaProperty' &&
      node.object.meta.name === 'import' &&
      node.object.property.name === 'meta'
    )
  }

  /** path.delimiter, path.sep */
  function isStaticPathMember(node) {
    if (!scope) return false
    if (node.computed || node.property.type !== 'Identifier') return false
    if (!PATH_STATIC_MEMBERS.has(node.property.name)) return false

    const pathInfo = getImportAccessPath({ node: node.object, scope, packageNames: PATH_PACKAGE_NAMES })
    return pathInfo !== null && pathInfo.path.length === 0
  }

  /** path.resolve(__dirname, './foo'), path.join(__dirname, 'bar') etc. */
  function isStaticPathCall(node) {
    if (!scope) return false
    if (node.callee.type !== 'MemberExpression' && node.callee.type !== 'Identifier') return false

    const pathInfo = getImportAccessPath({ node: node.callee, scope, packageNames: PATH_PACKAGE_NAMES })
    if (!pathInfo) return false

    let name
    if (pathInfo.path.length === 1) {
      name = pathInfo.path[0]
    } else if (pathInfo.path.length === 2 && pathInfo.path[0] === 'posix') {
      name = pathInfo.path[1]
    }
    if (!name || !PATH_METHODS.has(name)) return false

    return node.arguments.length > 0 && node.arguments.every(isStatic)
  }

  /** url.fileURLToPath(import.meta.url) */
  function isStaticFileURLToPath(node) {
    if (!scope) return false
    if (node.callee.type !== 'MemberExpression' && node.callee.type !== 'Identifier') return false

    const urlInfo = getImportAccessPath({ node: node.callee, scope, packageNames: URL_PACKAGE_NAMES })
    if (!urlInfo || urlInfo.path.length !== 1 || urlInfo.path[0] !== 'fileURLToPath') return false

    return node.arguments.length > 0 && node.arguments.every(isStatic)
  }

  /** require.resolve('eslint/package.json') */
  function isStaticRequireResolve(node) {
    if (!scope) return false
    if (
      node.callee.type !== 'MemberExpression' ||
      node.callee.computed ||
      node.callee.property.type !== 'Identifier' ||
      node.callee.property.name !== 'resolve' ||
      node.callee.object.type !== 'Identifier' ||
      node.callee.object.name !== 'require'
    ) return false

    const variable = findVariableInScope(scope, 'require')
    if (!variable || variable.defs.length !== 0) return false

    return node.arguments.length > 0 && node.arguments.every(isStatic)
  }

  /** process.cwd() */
  function isStaticCwd(node) {
    if (!scope) return false
    if (
      node.callee.type !== 'MemberExpression' ||
      node.callee.computed ||
      node.callee.property.type !== 'Identifier' ||
      node.callee.property.name !== 'cwd' ||
      node.callee.object.type !== 'Identifier' ||
      node.callee.object.name !== 'process'
    ) return false

    const variable = findVariableInScope(scope, 'process')
    // process is a Node.js global — accept when not found in scope (undeclared global)
    // or when found but not user-defined (zero definitions = built-in/global)
    if (variable && variable.defs.length !== 0) return false

    return true
  }
}

/**
 * Resolve an AST node back to a require/import from specific packages.
 * Returns { path: string[], packageName: string } or null.
 *
 * Handles:
 *   const fs = require('fs') → fs.readFile(x) → { path: ['readFile'], packageName: 'fs' }
 *   const { readFile } = require('fs') → readFile(x) → { path: ['readFile'], packageName: 'fs' }
 *   const readFile = require('fs').readFile → readFile(x) → { path: ['readFile'], packageName: 'fs' }
 *   require('fs').readFile(x) → { path: ['readFile'], packageName: 'fs' }
 *   import fs from 'fs' → fs.readFile(x) → { path: ['readFile'], packageName: 'fs' }
 *   import { readFile } from 'fs' → readFile(x) → { path: ['readFile'], packageName: 'fs' }
 *   import * as fs from 'fs' → fs.readFile(x) → { path: ['readFile'], packageName: 'fs' }
 *   fs.promises.readFile(x) → { path: ['promises', 'readFile'], packageName: 'fs' }
 */
function getImportAccessPath({ node, scope, packageNames }) {
  const tracked = new Set()
  return resolve(node)

  function resolve(node) {
    if (!node || tracked.has(node)) return null
    tracked.add(node)

    if (node.type === 'Identifier') {
      return resolveIdentifier(node)
    }

    if (node.type === 'MemberExpression') {
      if (node.computed) return null
      const nesting = resolve(node.object)
      if (!nesting) return null
      return {
        path: [...nesting.path, node.property.name],
        packageName: nesting.packageName,
      }
    }

    if (isRequireCall(node)) {
      return {
        path: [],
        packageName: node.arguments[0].value,
      }
    }

    return null
  }

  function resolveIdentifier(node) {
    const variable = findVariableInScope(scope, node.name)
    if (!variable) return null

    // Check variable declarations: const x = require('fs'), const { readFile } = require('fs'), etc.
    const declDef = variable.defs.find(
      def => def.type === 'Variable' && def.node.type === 'VariableDeclarator' && def.node.init
    )
    if (declDef) {
      let propName = null

      if (declDef.node.id.type === 'ObjectPattern') {
        // const { readFile: something } = require('fs')
        const property = declDef.node.id.properties.find(
          p => p.type === 'Property' && p.value.type === 'Identifier' && p.value.name === node.name
        )
        if (property && !property.computed) {
          propName = property.key.name || property.key.value
        }
      } else if (declDef.node.id.type !== 'Identifier') {
        return null
      }

      const nesting = resolve(declDef.node.init)
      if (!nesting) return null

      return {
        path: propName ? [...nesting.path, propName] : nesting.path,
        packageName: nesting.packageName,
      }
    }

    // Check import bindings: import x from 'fs', import { readFile } from 'fs', import * as fs from 'fs'
    const importDef = variable.defs.find(
      def => def.type === 'ImportBinding' &&
        def.node.parent &&
        def.node.parent.type === 'ImportDeclaration' &&
        packageNames.includes(def.node.parent.source.value)
    )
    if (importDef) {
      let propName = null
      if (importDef.node.type === 'ImportSpecifier') {
        propName = importDef.node.imported.name
      }
      // ImportDefaultSpecifier and ImportNamespaceSpecifier → path stays []
      return {
        path: propName ? [propName] : [],
        packageName: importDef.node.parent.source.value,
      }
    }

    return null
  }

  function isRequireCall(expression) {
    return (
      expression &&
      expression.type === 'CallExpression' &&
      expression.callee.type === 'Identifier' &&
      expression.callee.name === 'require' &&
      expression.arguments.length > 0 &&
      expression.arguments[0].type === 'Literal' &&
      packageNames.includes(expression.arguments[0].value)
    )
  }
}

/**
 * Check if a node is any kind of literal (string, number, boolean, null, regex).
 */
function isLiteral(node) {
  return node && node.type === 'Literal'
}

/**
 * Extract the property chain from a callee node.
 * e.g. `fs.readFile(...)` → ['fs', 'readFile']
 * e.g. `exec(...)` → ['exec']
 */
function getCalleePropertyChain(node) {
  if (node.type === 'Identifier') return [node.name]
  if (node.type === 'MemberExpression' && !node.computed) {
    const chain = getCalleePropertyChain(node.object)
    if (!chain) return null
    if (node.property.type === 'Identifier') {
      return [...chain, node.property.name]
    }
  }
  return null
}

/**
 * Check if a variable name matches known security-sensitive keywords.
 */
function isSecuritySensitiveName(name) {
  if (!name || typeof name !== 'string') return false
  return SECURITY_KEYWORD_RE.test(name)
}

/**
 * Find whether a given identifier was imported/required from a specific package.
 * Returns the local binding name or null.
 *
 * Handles:
 *   const fs = require('fs')
 *   const { readFile } = require('fs')
 *   import fs from 'fs'
 *   import { readFile } from 'fs'
 */
function findImportedName(scope, identifierName, packageNames) {
  if (!scope || !identifierName) return null

  const variable = findVariableInScope(scope, identifierName)
  if (!variable) return null

  for (const def of variable.defs) {
    if (def.type === 'ImportBinding' && def.parent && def.parent.source) {
      const source = def.parent.source.value
      if (packageNames.includes(source)) return identifierName
    }

    if (def.type === 'Variable' && def.node && def.node.init) {
      const init = def.node.init
      if (
        init.type === 'CallExpression' &&
        init.callee.type === 'Identifier' &&
        init.callee.name === 'require' &&
        init.arguments.length > 0 &&
        init.arguments[0].type === 'Literal' &&
        packageNames.includes(init.arguments[0].value)
      ) {
        return identifierName
      }
    }
  }

  return null
}

function findVariableInScope(scope, name) {
  let current = scope
  while (current) {
    const found = current.set && current.set.get(name)
    if (found) return found
    current = current.upper
  }
  return null
}
