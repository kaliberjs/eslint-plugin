const { resolve } = require('node:path')
const { pathToFileURL } = require('node:url')

module.exports = function docsUrl(ruleDir) {
  return pathToFileURL(resolve(ruleDir, 'readme.md')).href
}
