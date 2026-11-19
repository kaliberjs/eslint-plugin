const docsUrl = require('../../machinery/docsUrl')
const { isStaticExpression, getImportAccessPath } = require('../../machinery/security')

const FS_PACKAGES = ['fs', 'node:fs', 'fs/promises', 'node:fs/promises', 'fs-extra']
const FS_METHODS = [
  'access', 'accessSync', 'appendFile', 'appendFileSync',
  'chmod', 'chmodSync', 'chown', 'chownSync', 'close', 'closeSync',
  'copyFile', 'copyFileSync', 'exists', 'existsSync',
  'fchmod', 'fchmodSync', 'fchown', 'fchownSync',
  'fdatasync', 'fdatasyncSync', 'fstat', 'fstatSync',
  'fsync', 'fsyncSync', 'ftruncate', 'ftruncateSync',
  'futimes', 'futimesSync', 'lchmod', 'lchmodSync',
  'lchown', 'lchownSync', 'link', 'linkSync',
  'lstat', 'lstatSync', 'mkdir', 'mkdirSync',
  'mkdtemp', 'mkdtempSync', 'open', 'openSync',
  'read', 'readSync', 'readdir', 'readdirSync',
  'readFile', 'readFileSync', 'readlink', 'readlinkSync',
  'realpath', 'realpathSync', 'rename', 'renameSync',
  'rmdir', 'rmdirSync', 'rm', 'rmSync',
  'stat', 'statSync', 'symlink', 'symlinkSync',
  'truncate', 'truncateSync', 'unlink', 'unlinkSync',
  'utimes', 'utimesSync', 'write', 'writeSync',
  'writeFile', 'writeFileSync',
  'createReadStream', 'createWriteStream',
]

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects fs calls with non-literal filenames, which can enable path traversal attacks',
      url: docsUrl(__dirname),
    },
    schema: [],
    messages: {
      nonLiteralFsFilename: '{{method}}() called with a non-literal filename — this can enable path traversal attacks',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode || context.getSourceCode()

    return {
      CallExpression(node) {
        // Skip require() calls and calls with no arguments
        if (
          (node.callee.type === 'Identifier' && node.callee.name === 'require') ||
          node.arguments.length === 0
        ) return

        const scope = sourceCode.getScope ? sourceCode.getScope(node) : context.getScope()

        // Use getImportAccessPath to resolve the callee back to an fs package
        const pathInfo = getImportAccessPath({
          node: node.callee,
          scope,
          packageNames: FS_PACKAGES,
        })
        if (!pathInfo) return

        // Determine the fs method name from the access path
        let method
        if (pathInfo.path.length === 1) {
          // fs.readFile(), readFile() (destructured), require('fs').readFile()
          method = pathInfo.path[0]
        } else if (pathInfo.path.length === 2 && pathInfo.path[0] === 'promises') {
          // fs.promises.readFile(), require('fs').promises.readFile()
          method = pathInfo.path[1]
        } else {
          return
        }

        if (!FS_METHODS.includes(method)) return

        // Check if the first argument is a static expression
        if (isStaticExpression(node.arguments[0], scope)) return

        context.report({
          node,
          messageId: 'nonLiteralFsFilename',
          data: { method },
        })
      },
    }
  },
}
