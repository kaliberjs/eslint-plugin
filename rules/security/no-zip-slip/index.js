const { findVariable } = require('@eslint-community/eslint-utils')
const { getStaticPropertyName, isFunctionNode } = require('../../../machinery/ast')
const docsUrl = require('../../../machinery/docsUrl')
const { report } = require('../../../machinery/security/finding')

// Zip Slip: an archive stores the name of every entry, and nothing stops
// that name from being `../../etc/cron.d/x` or `/etc/cron.d/x`. Writing an
// entry to `join(dest, entry.path)` without checking the resolved
// destination is an arbitrary file write (CWE-22).
//
// The source is intrinsic to the API shape — an entry's own name — so this
// is a matcher, not a taint rule: there is no request to trace from.
//
// Deliberately NOT reported: a bare `tar.x({ file, cwd })`, an
// `adm-zip` `extractAllTo`, `unzipper.Extract({ path })` or
// `directory.extract({ path })`. Every one of those containment-checks
// internally in the versions in use today (see readme for the version
// boundaries) — flagging them would make the rule wrong about the libraries
// it exists to police. What is left is the code that does the joining
// itself, and the one option that switches the built-in check off.

const ENTRY_NAME_PROPERTIES = new Set([
  'path',       // unzipper entry, tar ReadEntry
  'fileName',   // yauzl
  'entryName',  // adm-zip
  'name',       // node-stream-zip, tar header
])

// Where a function parameter is known to be an archive entry.
const ENTRY_EVENTS = new Set(['entry'])
const ENTRY_LISTENERS = new Set(['on', 'once', 'addListener'])
const ENTRY_OPTIONS = new Set(['onentry', 'onEntry', 'onReadEntry'])
const COLLECTION_ITERATORS = new Set(['forEach', 'map', 'filter', 'flatMap'])

// Only used to gate the weakest entry shape (iterating `.files`), which
// without this would match any collection of file-ish objects.
const ARCHIVE_MODULES = /^(unzipper|yauzl(-promise)?|adm-zip|node-stream-zip|extract-zip|decompress|tar(-stream|-fs)?)$/

// Filesystem calls that create or replace something at their first
// argument. Reads are not zip slip.
const WRITE_FUNCTIONS = new Set([
  'createWriteStream', 'writeFile', 'writeFileSync', 'appendFile', 'appendFileSync',
  'copyFile', 'copyFileSync', 'open', 'openSync', 'mkdir', 'mkdirSync', 'rename', 'renameSync',
  'symlink', 'symlinkSync', 'link', 'linkSync', 'truncate', 'truncateSync',
  // fs-extra
  'outputFile', 'outputFileSync', 'ensureDir', 'ensureDirSync', 'ensureFile', 'ensureFileSync',
  'outputJson', 'outputJsonSync', 'writeJson', 'writeJsonSync', 'move', 'moveSync', 'copy', 'copySync',
])

// ... except the copy/move/link family, where argument 0 is the source
// being read and argument 1 is what gets created.
const WRITE_DESTINATION_SECOND = new Set([
  'copyFile', 'copyFileSync', 'copy', 'copySync', 'rename', 'renameSync',
  'move', 'moveSync', 'symlink', 'symlinkSync', 'link', 'linkSync',
])

// A containment check, seen from the outside. `path.relative(...)`,
// `.startsWith(...)`, `.indexOf(...)` and `path.basename(...)` are the
// idioms; the name pattern catches a helper doing it out of sight.
const GUARD_FUNCTIONS = new Set(['startsWith', 'relative', 'indexOf', 'basename'])
const GUARD_NAME = /safe|saniti[sz]|contain|inside|within|traversal|escape|assert/i

const TAR_EXTRACTORS = new Set(['x', 'extract'])
const TAR_MODULE = /^(node:)?tar$/

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Check archive entry paths stay inside the extraction directory before writing them (CWE-22, OWASP A01:2021)',
      url: docsUrl(__dirname),
    },
    messages: {
      zipSlip: [
        "The archive entry's own name ({{ entry }}) is used as the destination of a filesystem write.",
        'An entry named `../../etc/cron.d/x`, or an absolute path, then writes outside the extraction directory — this is Zip Slip, an arbitrary file write.',
        'Resolve the destination and assert it stays inside the target directory (`resolved.startsWith(dest + path.sep)`), or write to `path.basename(...)` of the entry name.',
      ].join(' '),
      skipEntryNameValidation: [
        '`skipEntryNameValidation: true` turns off node-stream-zip\'s check on entry names.',
        'Entries containing `..`, a leading `/`, a drive letter or a backslash are then emitted and extracted as the archive spells them.',
        'Remove it, and check containment yourself if you write entries out by hand.',
      ].join(' '),
      tarPreservePaths: [
        '`preservePaths: true` turns off node-tar\'s built-in containment check.',
        'Absolute paths and entries containing `..` are then extracted where the archive says, not inside `cwd`.',
        'Remove it, or pass a `filter` / `onentry` that rejects absolute and `..` paths.',
      ].join(' '),
    },
    // No fix: where the containment check belongs, and what the intended
    // base directory is, are the author's to decide.
    schema: [],
  },

  create(context) {
    // Reported at Program:exit so a guard anywhere in the enclosing
    // function counts, including one written after the write itself.
    const guarded = new Set()
    const candidates = []
    let hasArchiveImport = false

    return {
      ImportDeclaration(node) {
        if (ARCHIVE_MODULES.test(String(node.source.value))) hasArchiveImport = true
      },

      // `new StreamZip({ ... })` is the documented shape; the option is
      // read the same way whichever it is.
      NewExpression(node) {
        checkSkipEntryNameValidation(context, node)
      },

      CallExpression(node) {
        if (isArchiveRequire(node)) hasArchiveImport = true

        if (isGuardCall(node)) {
          for (const scope of enclosingScopes(node)) guarded.add(scope)
        }

        checkTarPreservePaths(context, node)
        checkSkipEntryNameValidation(context, node)

        const write = calleeName(node.callee)
        if (!WRITE_FUNCTIONS.has(write)) return

        const destination = node.arguments[WRITE_DESTINATION_SECOND.has(write) ? 1 : 0]
        candidates.push({ destination, scopes: enclosingScopes(node) })
      },

      // Resolved here rather than at the call site so that an archive
      // import further down the file is still seen.
      'Program:exit'() {
        for (const { destination, scopes } of candidates) {
          if (scopes.some(scope => guarded.has(scope))) continue

          const node = findEntryName(context, destination, () => hasArchiveImport)
          if (!node) continue

          report(context, {
            node,
            messageId: 'zipSlip',
            data: { entry: context.sourceCode.getText(node) },
            severity: 'high',
            confidence: 1,
          })
        }
      },
    }
  },
}

/**
 * The archive entry name inside a destination expression, wherever it sits:
 * `path.join(dest, entry.path)`, a template literal, a concatenation, or a
 * local variable holding any of those. One hop of variable indirection is
 * followed, matching the depth of every other matcher rule here.
 *
 * Returns null for `path.basename(entry.path)` — taking the basename is a
 * sanitizer, not a use.
 */
function findEntryName(context, node, hasArchiveImport, seen = new Set()) {
  if (!node || seen.has(node)) return null
  seen.add(node)

  const find = next => findEntryName(context, next, hasArchiveImport, seen)

  switch (node.type) {
    case 'MemberExpression':
      return isEntryNameExpression(context, node, hasArchiveImport) ? node : null

    case 'Identifier': {
      if (isEntryNameBinding(context, node, hasArchiveImport)) return node
      const definition = findVariable(context.sourceCode.getScope(node), node)?.defs[0]
      return definition?.type === 'Variable' ? find(definition.node.init) : null
    }

    case 'CallExpression': {
      if (GUARD_FUNCTIONS.has(calleeName(node.callee))) return null
      return node.arguments.map(find).find(Boolean) ?? null
    }

    case 'TemplateLiteral':
      return node.expressions.map(find).find(Boolean) ?? null

    case 'BinaryExpression':
      return find(node.left) ?? find(node.right)

    case 'LogicalExpression':
      return find(node.left) ?? find(node.right)

    case 'ConditionalExpression':
      return find(node.consequent) ?? find(node.alternate)

    default:
      return null
  }
}

/** entry.path, entry.fileName, entry.entryName, entry.header.name */
function isEntryNameExpression(context, node, hasArchiveImport) {
  const property = memberName(node)
  if (!property || !ENTRY_NAME_PROPERTIES.has(property)) return false

  const object = node.object
  if (object.type === 'MemberExpression' && memberName(object) === 'header') {
    return isArchiveEntry(context, object.object, hasArchiveImport)
  }

  return isArchiveEntry(context, object, hasArchiveImport)
}

/** The destructured forms: `({ path }) => ...` and `const { fileName } = entry`. */
function isEntryNameBinding(context, identifier, hasArchiveImport) {
  const definition = findVariable(context.sourceCode.getScope(identifier), identifier)?.defs[0]
  const property = definition?.name?.parent
  if (property?.type !== 'Property') return false

  const pattern = property.parent
  if (pattern?.type !== 'ObjectPattern') return false
  if (!ENTRY_NAME_PROPERTIES.has(String(getStaticPropertyName(property)))) return false

  if (pattern.parent?.type === 'VariableDeclarator') {
    return isArchiveEntry(context, pattern.parent.init, hasArchiveImport)
  }

  return isFunctionNode(pattern.parent) && isEntryHandler(pattern.parent, hasArchiveImport)
}

/**
 * Whether an identifier is bound to an archive entry. Provenance matters:
 * `.name` and `.path` are ordinary property names, so without this every
 * `path.join(dir, file.name)` in the codebase would be a Zip Slip finding.
 */
function isArchiveEntry(context, node, hasArchiveImport) {
  if (node?.type !== 'Identifier') return false

  const definition = findVariable(context.sourceCode.getScope(node), node)?.defs[0]
  if (!definition) return false

  // stream.on('entry', entry => ...), tar.x({ onentry: entry => ... })
  if (definition.type === 'Parameter') return isEntryHandler(definition.node, hasArchiveImport)

  if (definition.type !== 'Variable') return false

  // for (const file of directory.files) — unzipper's Open.* API
  const declaration = definition.node.parent
  if (declaration?.type === 'VariableDeclaration' && declaration.parent?.type === 'ForOfStatement') {
    return isFilesCollection(declaration.parent.right) && hasArchiveImport()
  }

  // const e = entry
  return isArchiveEntry(context, definition.node.init, hasArchiveImport)
}

/** A function that is called once per archive entry, with the entry first. */
function isEntryHandler(fn, hasArchiveImport) {
  const parent = fn.parent

  // { onentry: entry => ... } passed to tar, { onEntry } to extract-zip
  if (parent?.type === 'Property') return ENTRY_OPTIONS.has(String(getStaticPropertyName(parent)))

  if (parent?.type !== 'CallExpression' || parent.callee.type !== 'MemberExpression') return false
  const method = memberName(parent.callee)

  // zipfile.on('entry', ...) — unzipper Parse, yauzl, node-stream-zip, tar
  if (ENTRY_LISTENERS.has(method)) {
    const event = parent.arguments[0]
    return event?.type === 'Literal' && ENTRY_EVENTS.has(String(event.value))
  }

  // directory.files.forEach(file => ...) — unzipper's Open.* API. The
  // weakest shape of the three, so it also requires an archive library to
  // be imported in this file.
  if (COLLECTION_ITERATORS.has(method)) return isFilesCollection(parent.callee.object) && hasArchiveImport()

  return false
}

/**
 * The collection an archive library hands you all entries in:
 * `directory.files` (unzipper's Open.*) and `zip.getEntries()` (adm-zip).
 */
function isFilesCollection(node) {
  if (node?.type === 'CallExpression') return calleeName(node.callee) === 'getEntries'
  return node?.type === 'MemberExpression' && memberName(node) === 'files'
}

/**
 * `tar.x({ preservePaths: true })`. node-tar strips leading `/` and refuses
 * entries containing `..` unless this option says otherwise, so the bare
 * call is safe and only the opt-out is reported.
 *
 * A `filter` is accepted as the author's own check — it is the only tar
 * hook that can refuse an entry, and its contents are no more readable than
 * the `algorithms` list no-jwt-algorithm-confusion accepts. `onentry` /
 * `onReadEntry` are deliberately *not* accepted: node-tar's README is
 * explicit that they are called with entries that already passed the
 * filter, and they cannot veto anything.
 */
function checkTarPreservePaths(context, node) {
  if (!TAR_EXTRACTORS.has(importedName(context, node.callee))) return
  if (!isTarCallee(context, node.callee)) return

  const options = node.arguments.find(argument => argument.type === 'ObjectExpression')
  const preservePaths = options && findProperty(options, ['preservePaths', 'P'])
  if (preservePaths?.value?.type !== 'Literal' || preservePaths.value.value !== true) return
  if (findProperty(options, ['filter'])) return

  report(context, {
    node: preservePaths,
    messageId: 'tarPreservePaths',
    severity: 'high',
    confidence: 1,
  })
}

/**
 * `new StreamZip({ skipEntryNameValidation: true })`. node-stream-zip
 * refuses entry names containing `..`, a leading `/`, a drive letter or a
 * backslash before it emits them (>= 1.4.0); this is the switch that turns
 * that off, and the option name is unique enough to need no provenance
 * check.
 */
function checkSkipEntryNameValidation(context, node) {
  const options = node.arguments.find(argument => argument.type === 'ObjectExpression')
  const skip = options && findProperty(options, ['skipEntryNameValidation'])
  if (skip?.value?.type !== 'Literal' || skip.value.value !== true) return

  report(context, {
    node: skip,
    messageId: 'skipEntryNameValidation',
    severity: 'high',
    confidence: 1,
  })
}

function findProperty(objectExpression, names) {
  return objectExpression.properties.find(
    it => it.type === 'Property' && names.includes(String(getStaticPropertyName(it)))
  ) ?? null
}

function isTarCallee(context, callee) {
  if (callee.type === 'Identifier') return isTarBinding(context, callee)
  if (callee.type !== 'MemberExpression') return false

  const object = callee.object
  if (object.type === 'CallExpression') return isTarRequire(object)
  return object.type === 'Identifier' && isTarBinding(context, object)
}

function isTarBinding(context, identifier) {
  const definition = findVariable(context.sourceCode.getScope(identifier), identifier)?.defs[0]
  if (!definition) return false

  if (definition.type === 'ImportBinding') return TAR_MODULE.test(String(definition.parent.source.value))
  if (definition.type === 'Variable') return isTarRequire(definition.node.init)

  return false
}

function isTarRequire(node) {
  return isRequireCall(node) && TAR_MODULE.test(String(node.arguments[0].value))
}

function isArchiveRequire(node) {
  return isRequireCall(node) && ARCHIVE_MODULES.test(String(node.arguments[0].value))
}

function isRequireCall(node) {
  return node?.type === 'CallExpression'
    && node.callee?.type === 'Identifier'
    && node.callee.name === 'require'
    && node.arguments[0]?.type === 'Literal'
}

/**
 * Any visible containment-shaped check. A rule that fires even when the
 * developer plainly tried is worse than one with a known gap, so this is
 * deliberately generous: a `startsWith`, a `path.relative`, a
 * `path.basename`, or a helper whose name says it validates, anywhere in an
 * enclosing scope, is enough.
 */
function isGuardCall(node) {
  const name = calleeName(node.callee)
  return Boolean(name) && (GUARD_FUNCTIONS.has(name) || GUARD_NAME.test(name))
}

/** Every function containing `node`, plus the module scope. */
function enclosingScopes(node) {
  const scopes = []
  for (let current = node; current; current = current.parent) {
    if (isFunctionNode(current) || current.type === 'Program') scopes.push(current)
  }
  return scopes
}

/** The called name, through a member expression or a computed literal. */
function calleeName(callee) {
  if (callee.type === 'Identifier') return callee.name
  if (callee.type === 'MemberExpression') return memberName(callee)
  return null
}

/**
 * The name a callee was imported under, so `const { x: extract } =
 * require('tar')` matches on `x`. Renaming an import is the cheapest
 * evasion of a name matcher and the binding is resolved anyway.
 */
function importedName(context, callee) {
  if (callee.type !== 'Identifier') return calleeName(callee)

  const definition = findVariable(context.sourceCode.getScope(callee), callee)?.defs[0]

  if (definition?.node?.type === 'ImportSpecifier') return definition.node.imported?.name ?? callee.name

  if (definition?.type === 'Variable' && definition.node.id?.type === 'ObjectPattern') {
    const property = definition.node.id.properties.find(
      it => it.type === 'Property' && it.value === definition.name
    )
    if (property) return String(getStaticPropertyName(property))
  }

  return callee.name
}

function memberName(node) {
  if (!node.computed) return node.property?.name ?? null
  return node.property?.type === 'Literal' ? String(node.property.value) : null
}
