const path = require('node:path')

module.exports = {
  isApp, isPage, isTemplate, isUniversal,
  getBaseFilename, getLayer, findSrcRoot,
}

function isApp(context) {
  const filename = context.filename
  return !!filename && filename.endsWith('App.js')
}

function isPage(context) {
  const filename = context.filename
  return /.+\/pages\/[^/]+\.js/.test(filename)
}

function isTemplate(context) {
  const filename = context.filename
  return /.+\.[^.]+\.js/.test(filename)
}

function getBaseFilename(context) {
  const filename = context.filename
  const basename = path.basename(filename, '.js')

  if (isTemplate(context)) {
    const [name] = basename.split('.')
    return name.slice(0, 1).toUpperCase() + name.slice(1)
  } else return basename
}

function isUniversal(context) {
  const filename = context.filename
  return !!filename && filename.endsWith('.universal.js')
}

function getLayer(filePath) {
  const srcRoot = findSrcRoot(filePath)
  if (!srcRoot) return null

  const relative = filePath.slice(srcRoot.length + 1)
  const segments = relative.split(path.sep)
  if (!segments.length) return null

  if (segments[0] === 'features' && segments.length > 1) return 'features/' + segments[1]
  return segments[0]
}

function findSrcRoot(filePath) {
  const segments = filePath.split(path.sep)
  const srcIndex = segments.lastIndexOf('src')
  if (srcIndex === -1) return null
  return segments.slice(0, srcIndex + 1).join(path.sep)
}
