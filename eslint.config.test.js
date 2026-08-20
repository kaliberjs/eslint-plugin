const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { test } = require('node:test')

const config = require('./eslint.config')

test('resolves the Babel preset from this package', t => {
  const consumerDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'kaliber-eslint-consumer-'))
  t.after(() => fs.rmSync(consumerDirectory, { recursive: true, force: true }))

  createConflictingConsumerPreset(consumerDirectory)

  const { parser, parserOptions } = config
    .find(entry => entry.languageOptions?.parserOptions?.babelOptions)
    .languageOptions

  const result = parser.parseForESLint('const element = <div />', {
    ...parserOptions,
    babelOptions: {
      ...parserOptions.babelOptions,
      cwd: consumerDirectory,
    },
    filePath: path.join(consumerDirectory, 'fixture.js'),
  })

  assert.equal(result.ast.type, 'Program')
})

function createConflictingConsumerPreset(consumerDirectory) {
  const presetDirectory = path.join(consumerDirectory, 'node_modules/@babel/preset-react')
  fs.mkdirSync(presetDirectory, { recursive: true })
  fs.writeFileSync(
    path.join(presetDirectory, 'package.json'),
    JSON.stringify({ name: '@babel/preset-react', version: '7.0.0', main: 'index.js' })
  )
  fs.writeFileSync(
    path.join(presetDirectory, 'index.js'),
    "throw new Error('Loaded the consumer preset instead of the plugin preset')\n"
  )
}
