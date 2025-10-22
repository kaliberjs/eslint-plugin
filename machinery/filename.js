const path = require('node:path')

module.exports = {
  isApp, isPage, isTemplate, isUniversal, isRaw,
  getBaseFilename,
  getFilename
}

// Compatibility wrapper to accept both ESLint context and Oxlint
function getFilename(data) {
  if (typeof data.getFilename === 'function') return data.getFilename()
  else if (typeof data.filename === 'string') return data.filename
  else return data
}

function isApp(data) {
  const filename = getFilename(data)
  return !!filename && filename.endsWith('App.js')
}

function isPage(data) {
  const filename = getFilename(data)
  return /.+\/pages\/[^/]+\.js/.test(filename)
}

function isTemplate(data) {
  const filename = getFilename(data)
  return /.+\.[^.]+\.js/.test(filename)
}

function isUniversal(data) {
  const filename = getFilename(data)
  return filename.endsWith('.universal.js')
}

function isRaw(data) {
  const filename = getFilename(data)
  return filename.endsWith('.raw.js')
}

function getBaseFilename(data) {
  const filename = getFilename(data)
  const basename = path.basename(filename, '.js')

  if (isTemplate(filename)) { 
    const [name] = basename.split('.')
    return name.slice(0, 1).toUpperCase() + name.slice(1)
  } else return basename
}
