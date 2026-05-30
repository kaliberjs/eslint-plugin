const { resolve, basename } = require('node:path')

module.exports = function docsUrl(ruleDir) {
  return `file://${resolve(ruleDir, '..', '..', 'docs', basename(ruleDir) + '.md')}`
}
