const fs = require('node:fs')
const nodePath = require('node:path')
const espree = require('espree')
const { firstLetterLowerCase } = require('../../machinery/word')
const { isUniversal } = require('../../machinery/filename')
const docsUrl = require('../../machinery/docsUrl')

const messages = {
  'no null return':
    `Unexpected 'return null' in universal component — this crashes @kaliber/build. ` +
    `Return a non-rendering element like <span hidden /> instead.`,

  'no empty fragment return':
    `Unexpected empty fragment return in universal component — this crashes @kaliber/build. ` +
    `Return a non-rendering element like <span hidden /> instead.`,

  'no logical and return':
    `Unexpected logical && return in universal component — when the condition is falsy, ` +
    `this crashes @kaliber/build. Use a ternary with a non-rendering element instead.`,

  'source component may return null': componentName =>
    `Component '${componentName}' re-exported as universal can return null — ` +
    `this crashes @kaliber/build. Ensure it always returns a valid element.`,

  'source component may return empty fragment': componentName =>
    `Component '${componentName}' re-exported as universal can return an empty fragment — ` +
    `this crashes @kaliber/build. Ensure it always returns a valid element.`,

  'source component may use logical and': componentName =>
    `Component '${componentName}' re-exported as universal uses a logical && return — ` +
    `when the condition is falsy, this crashes @kaliber/build.`,
}

module.exports = {
  messages,

  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow returning null, empty fragments, or implicitly falsy values from universal components',
      url: docsUrl(__dirname),
    },
  },

  create(context) {
    if (!isUniversal(context)) return {}

    return {
      ReturnStatement(node) {
        if (!isInsideComponentFunction(node)) return
        checkReturnValue(node.argument)
      },

      // export { default } from './Component'
      // export { Component as default } from './Component'
      ExportNamedDeclaration(node) {
        if (!node.source) return
        const defaultSpec = node.specifiers.find(s => s.exported.name === 'default')
        if (!defaultSpec) return

        const exportedName = defaultSpec.local.name
        checkReExportedSource(node, node.source.value, exportedName)
      },

      // import { X } from './X'; export default X
      ExportDefaultDeclaration(node) {
        if (node.declaration.type !== 'Identifier') return

        const name = node.declaration.name
        const importDecl = findImportForIdentifier(name)
        if (!importDecl) return

        const spec = importDecl.specifiers.find(s => s.local.name === name)
        if (!spec) return

        const exportedName = spec.type === 'ImportDefaultSpecifier' ? 'default' : spec.imported.name
        checkReExportedSource(node, importDecl.source.value, exportedName)
      },
    }

    function findImportForIdentifier(name) {
      return context.sourceCode.ast.body.find(
        node => node.type === 'ImportDeclaration' &&
          node.specifiers.some(s => s.local.name === name)
      )
    }

    function checkReturnValue(expression) {
      if (!expression) return

      if (isNullLiteral(expression)) {
        context.report({
          message: messages['no null return'],
          node: expression,
        })
        return
      }

      if (isEmptyFragment(expression)) {
        context.report({
          message: messages['no empty fragment return'],
          node: expression,
        })
        return
      }

      if (expression.type === 'ConditionalExpression') {
        checkReturnValue(expression.consequent)
        checkReturnValue(expression.alternate)
        return
      }

      if (expression.type === 'LogicalExpression' && expression.operator === '&&') {
        context.report({
          message: messages['no logical and return'],
          node: expression,
        })
      }
    }

    function checkReExportedSource(reportNode, importSource, exportedName) {
      const resolvedPath = resolveImportPath(context.filename, importSource)
      if (!resolvedPath) return

      const sourceAst = parseFile(resolvedPath)
      if (!sourceAst) return

      const componentNode = findExportedComponent(sourceAst, exportedName)
      if (!componentNode) return

      const componentName = componentNode.id ? componentNode.id.name : exportedName
      const problems = findNullReturnProblems(componentNode)

      for (const problem of problems) {
        context.report({
          message: messages[problem](componentName),
          node: reportNode,
        })
      }
    }
  },
}

// ── AST checks (used for both inline and cross-file) ─────────────────

function isInsideComponentFunction(node) {
  let current = node.parent
  while (current) {
    if (
      current.type === 'FunctionDeclaration' ||
      current.type === 'FunctionExpression' ||
      current.type === 'ArrowFunctionExpression'
    ) {
      return (
        current.type === 'FunctionDeclaration' &&
        current.id &&
        !firstLetterLowerCase(current.id.name)
      )
    }
    current = current.parent
  }
  return false
}

function isNullLiteral(node) {
  return node.type === 'Literal' && node.value === null
}

function isEmptyFragment(node) {
  if (node.type === 'JSXFragment') return !hasMeaningfulChildren(node)

  if (node.type === 'JSXElement') {
    const { name } = node.openingElement
    const isReactFragment =
      (name.type === 'JSXIdentifier' && name.name === 'Fragment') ||
      (name.type === 'JSXMemberExpression' &&
        name.object.name === 'React' &&
        name.property.name === 'Fragment')

    return isReactFragment && !hasMeaningfulChildren(node)
  }

  return false
}

function hasMeaningfulChildren(node) {
  return node.children.some(child => {
    if (child.type === 'JSXText') return child.value.trim() !== ''
    return true
  })
}

// ── Cross-file analysis ──────────────────────────────────────────────

function resolveImportPath(fromFile, importSource) {
  if (!importSource.startsWith('.')) return null

  const dir = nodePath.dirname(fromFile)
  const resolved = nodePath.resolve(dir, importSource)

  const candidates = [resolved, `${resolved}.js`, `${resolved}/index.js`]
  return candidates.find(p => {
    try { return fs.statSync(p).isFile() }
    catch { return false }
  })
}

function parseFile(filePath) {
  try {
    const source = fs.readFileSync(filePath, 'utf-8')
    return espree.parse(source, {
      ecmaVersion: 2020,
      sourceType: 'module',
      ecmaFeatures: { jsx: true },
    })
  } catch {
    return null
  }
}

function findExportedComponent(ast, exportedName) {
  for (const node of ast.body) {
    if (exportedName === 'default') {
      if (
        node.type === 'ExportDefaultDeclaration' &&
        isFunctionNode(node.declaration)
      ) return node.declaration

      if (
        node.type === 'ExportDefaultDeclaration' &&
        node.declaration.type === 'Identifier'
      ) return findFunctionByName(ast, node.declaration.name)
    }

    if (
      node.type === 'ExportNamedDeclaration' &&
      node.declaration &&
      isFunctionNode(node.declaration) &&
      node.declaration.id &&
      node.declaration.id.name === exportedName
    ) return node.declaration

    if (node.type === 'ExportNamedDeclaration' && node.specifiers) {
      const spec = node.specifiers.find(s => s.exported.name === exportedName)
      if (spec) return findFunctionByName(ast, spec.local.name)
    }
  }
  return null
}

function findFunctionByName(ast, name) {
  for (const node of ast.body) {
    if (isFunctionNode(node) && node.id && node.id.name === name) return node

    if (node.type === 'VariableDeclaration') {
      for (const decl of node.declarations) {
        if (decl.id.name === name && decl.init && isFunctionNode(decl.init)) return decl.init
      }
    }
  }
  return null
}

function isFunctionNode(node) {
  return (
    node.type === 'FunctionDeclaration' ||
    node.type === 'FunctionExpression' ||
    node.type === 'ArrowFunctionExpression'
  )
}

/** Walk a function's body and find null-return problems (without parent refs). */
function findNullReturnProblems(funcNode) {
  const problems = []
  walkReturns(funcNode.body, returnArg => {
    if (!returnArg) return
    checkExpression(returnArg)
  })
  return problems

  function checkExpression(expr) {
    if (isNullLiteral(expr)) {
      problems.push('source component may return null')
      return
    }
    if (isEmptyFragment(expr)) {
      problems.push('source component may return empty fragment')
      return
    }
    if (expr.type === 'ConditionalExpression') {
      checkExpression(expr.consequent)
      checkExpression(expr.alternate)
      return
    }
    if (expr.type === 'LogicalExpression' && expr.operator === '&&') {
      problems.push('source component may use logical and')
    }
  }
}

/** Walk a function body collecting return arguments, skipping nested functions. */
function walkReturns(node, callback) {
  if (!node || typeof node !== 'object') return
  if (isFunctionNode(node)) return

  if (node.type === 'ReturnStatement') {
    callback(node.argument)
    return
  }

  for (const key of Object.keys(node)) {
    if (key === 'parent') continue
    const child = node[key]
    if (Array.isArray(child)) child.forEach(c => walkReturns(c, callback))
    else if (child && typeof child.type === 'string') walkReturns(child, callback)
  }
}
