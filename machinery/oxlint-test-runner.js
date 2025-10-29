const { spawn } = require('child_process')
const path = require('path')
const glob = require('glob')

const rulesDir = path.resolve(__dirname, '../rules')
const oxlintPath = path.resolve(__dirname, '../node_modules/.bin/oxlint')

const testFiles = glob.sync('**/test.js', { cwd: rulesDir })

const runTest = (testFile) => {
  return new Promise((resolve, reject) => {
    const ruleDir = path.dirname(testFile)
    const rule = path.basename(ruleDir)
    console.log(`Running tests for ${rule}...`)
    const oxlint = spawn(oxlintPath, ['--config', '.oxlintrc.json', path.resolve(rulesDir, testFile)])

    let stdout = ''
    let stderr = ''

    oxlint.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    oxlint.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    oxlint.on('close', (code) => {
      if (code === 0) {
        console.log(`Tests for ${rule} passed`)
        resolve({ rule, stdout, stderr })
      } else {
        console.error(`Tests for ${rule} failed with code ${code}`)
        reject({ rule, code, stdout, stderr })
      }
    })
  })
}

Promise.all(testFiles.map(runTest))
  .then((results) => {
    console.log('All tests passed!')
  })
  .catch((error) => {
    console.error('Some tests failed:')
    console.error(error)
    process.exit(1)
  })
