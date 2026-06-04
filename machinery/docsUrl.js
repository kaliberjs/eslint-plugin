const { resolve } = require('node:path')

module.exports = function docsUrl(ruleDir) {
  return `file://${resolve(ruleDir, 'readme.md')}`
}
