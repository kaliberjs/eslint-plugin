const node = require('eslint-import-resolver-node')
const { findRootDirectory } = require('./machinery/findRootDirectory')
const path = require('node:path')

const modifiers = [
  function removeQueryString(source, file, config) {
    const [newSource] = source.split('?')
    return newSource
  },
  function absoluteImport(source, file, config) {
    if (source.startsWith('/')) return path.resolve(findRootDirectory(file), config.path, '.' + source)
    return source
  }
]

module.exports = {
  interfaceVersion: 2,
  resolve
}

function resolve(source, file, config) {
  const newSource = modifiers.reduce(
    (result, modify) => modify(result, file, config),
    source
  )
  return node.resolve(newSource, file, config)
}
