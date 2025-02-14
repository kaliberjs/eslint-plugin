const fs = require('node:fs')
const path = require('node:path')
const process = require('node:process')

module.exports = { findRootDirectory }

function findRootDirectory(cwd) {
  const filePath = findFileInParents('package.json', cwd)
  return filePath && path.dirname(filePath)
}

function findFileInParents(name, directory = process.cwd()) {
  directory = path.resolve(directory)
  const root = path.parse(directory).root
  const filePath = path.join(directory, name)

  try {
    if (fs.statSync(filePath).isFile()) return filePath
  } catch {}

  return directory !== root
    ? findFileInParents(name, path.dirname(directory))
    : undefined
}
