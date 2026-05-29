#!/usr/bin/env node

'use strict'

const fs = require('fs')
const path = require('path')

const configFileNames = [
  '.eslintrc',
  '.eslintrc.json',
  '.eslintrc.js',
  '.eslintrc.cjs',
]

// Rules that moved from ESLint core to @stylistic/eslint-plugin
const stylisticRuleRenames = {
  'brace-style': '@stylistic/brace-style',
  'indent': '@stylistic/indent',
  'arrow-spacing': '@stylistic/arrow-spacing',
  'block-spacing': '@stylistic/block-spacing',
  'comma-dangle': '@stylistic/comma-dangle',
  'comma-spacing': '@stylistic/comma-spacing',
  'comma-style': '@stylistic/comma-style',
  'dot-location': '@stylistic/dot-location',
  'eol-last': '@stylistic/eol-last',
  'key-spacing': '@stylistic/key-spacing',
  'keyword-spacing': '@stylistic/keyword-spacing',
  'new-parens': '@stylistic/new-parens',
  'no-extra-parens': '@stylistic/no-extra-parens',
  'no-floating-decimal': '@stylistic/no-floating-decimal',
  'no-mixed-spaces-and-tabs': '@stylistic/no-mixed-spaces-and-tabs',
  'no-trailing-spaces': '@stylistic/no-trailing-spaces',
  'no-whitespace-before-property': '@stylistic/no-whitespace-before-property',
  'object-curly-spacing': '@stylistic/object-curly-spacing',
  'quotes': '@stylistic/quotes',
  'semi': '@stylistic/semi',
  'semi-spacing': '@stylistic/semi-spacing',
  'space-before-blocks': '@stylistic/space-before-blocks',
  'space-before-function-paren': '@stylistic/space-before-function-paren',
  'space-infix-ops': '@stylistic/space-infix-ops',
  'space-unary-ops': '@stylistic/space-unary-ops',
  'template-tag-spacing': '@stylistic/template-tag-spacing',
  'no-mixed-operators': '@stylistic/no-mixed-operators',
  'rest-spread-spacing': '@stylistic/rest-spread-spacing',
}

// Deprecated core rules renamed in ESLint v9
const deprecatedRuleRenames = {
  'no-native-reassign': 'no-global-assign',
  'no-negated-in-lhs': 'no-unsafe-negation',
  'no-new-object': 'no-object-constructor',
  'no-new-symbol': 'no-new-native-nonconstructor',
}

// Rules removed in ESLint v9 (no replacement)
const removedRules = [
  'no-return-await',
  'jsx-a11y/accessible-emoji',
  'jsx-a11y/scope',
]

// Plugin prefix remapping
const pluginRenames = {
  'import': 'import-x',
}

// ── Config shared by @kaliber/eslint-plugin/eslint.config ─────────────
// Rules that are already in the shared config — if a project has the same
// value, we can omit them from the project-specific overrides.
// We load this lazily so the script works standalone too.
function loadSharedRules() {
  try {
    const sharedConfig = require('../eslint.config')
    const configWithRules = sharedConfig.find(c => c.rules)
    return configWithRules ? configWithRules.rules : {}
  } catch {
    return {}
  }
}

// ── Main ──────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2)
  const flags = parseFlags(args)

  if (flags.help) {
    printUsage()
    process.exit(0)
  }

  const cwd = flags.cwd || process.cwd()
  const { config, filename } = findConfig(cwd)

  if (!config) {
    console.error('❌ No legacy ESLint config found.')
    console.error(`   Looked for: ${configFileNames.join(', ')}`)
    console.error(`   In: ${cwd}`)
    process.exit(1)
  }

  console.error(`📄 Found: ${filename}`)

  const targetPath = path.join(cwd, 'eslint.config.js')
  if (!flags.force && !flags.dryRun && !flags.stdout && fs.existsSync(targetPath)) {
    console.error('❌ eslint.config.js already exists. Use --force to overwrite.')
    process.exit(1)
  }

  const result = migrate(config)
  const output = generateOutput(result)

  if (flags.stdout || flags.dryRun) {
    console.log(output)
    if (flags.dryRun) {
      console.error('\n🔍 Dry run — no files written.')
    }
  } else {
    fs.writeFileSync(targetPath, output, 'utf8')
    console.error(`✅ Created: eslint.config.js`)
  }

  if (result.warnings.length > 0) {
    console.error('\n⚠️  Warnings:')
    result.warnings.forEach(w => console.error(`   • ${w}`))
  }

  if (!flags.stdout && !flags.dryRun) {
    console.error(`\n🧹 You can now delete ${filename}`)
  }
}

// ── Config discovery ─────────────────────────────────────────────────

function findConfig(cwd) {
  for (const name of configFileNames) {
    const filePath = path.join(cwd, name)
    if (!fs.existsSync(filePath)) continue

    if (name.endsWith('.js') || name.endsWith('.cjs')) {
      const raw = fs.readFileSync(filePath, 'utf8')
      // Attempt to extract the config object from module.exports = { ... }
      // We use a simple approach: require it
      try {
        const config = require(filePath)
        return { config, filename: name }
      } catch {
        return { config: null, filename: name }
      }
    }

    const raw = fs.readFileSync(filePath, 'utf8')
    // .eslintrc without extension is JSON (possibly with comments)
    const cleaned = stripJsonComments(raw)
    try {
      return { config: JSON.parse(cleaned), filename: name }
    } catch {
      return { config: null, filename: name }
    }
  }
  return { config: null, filename: null }
}

function stripJsonComments(str) {
  let result = ''
  let i = 0
  let inString = false

  while (i < str.length) {
    if (inString) {
      if (str[i] === '\\') {
        result += str[i] + str[i + 1]
        i += 2
        continue
      }
      if (str[i] === '"') inString = false
      result += str[i]
      i++
      continue
    }

    if (str[i] === '"') {
      inString = true
      result += str[i]
      i++
      continue
    }

    if (str[i] === '/' && str[i + 1] === '/') {
      while (i < str.length && str[i] !== '\n') i++
      continue
    }

    if (str[i] === '/' && str[i + 1] === '*') {
      i += 2
      while (i < str.length && !(str[i] === '*' && str[i + 1] === '/')) i++
      i += 2
      continue
    }

    result += str[i]
    i++
  }

  return result.replace(/,\s*([}\]])/g, '$1')
}

// ── Migration logic ──────────────────────────────────────────────────

function migrate(config) {
  const warnings = []
  const overrideRules = {}

  const sharedRules = loadSharedRules()

  // Process rules: rename, remap plugin prefixes, diff against shared config
  if (config.rules) {
    for (const [rule, value] of Object.entries(config.rules)) {
      // Skip removed rules
      if (removedRules.includes(rule)) {
        warnings.push(`Removed rule '${rule}' — no replacement in ESLint v9`)
        continue
      }

      let newName = rule

      // Rename deprecated core rules
      if (deprecatedRuleRenames[newName]) {
        const oldName = newName
        newName = deprecatedRuleRenames[newName]
        warnings.push(`Renamed deprecated rule '${oldName}' → '${newName}'`)
      }

      // Move stylistic rules to @stylistic namespace
      if (stylisticRuleRenames[newName]) {
        const oldName = newName
        newName = stylisticRuleRenames[newName]
        warnings.push(`Moved stylistic rule '${oldName}' → '${newName}'`)
      }

      // Remap plugin prefixes (import/ → import-x/)
      for (const [from, to] of Object.entries(pluginRenames)) {
        if (newName.startsWith(`${from}/`)) {
          newName = newName.replace(`${from}/`, `${to}/`)
        }
      }

      // Only include if it differs from the shared config
      if (sharedRules[newName] !== undefined) {
        if (deepEqual(sharedRules[newName], value)) continue
      }

      overrideRules[newName] = value
    }
  }

  // Collect custom globals (beyond what the shared config provides)
  const customGlobals = {}
  if (config.globals) {
    const knownGlobals = ['Component', 'React', 'cx']
    for (const [name, value] of Object.entries(config.globals)) {
      if (knownGlobals.includes(name)) continue
      // Normalize: true → 'readonly', false → 'off', 'writable'/'readonly' stay
      customGlobals[name] = normalizeGlobalValue(value)
    }
  }

  // Check for overrides (unsupported — warn)
  if (config.overrides && config.overrides.length > 0) {
    warnings.push(`'overrides' found — please migrate manually to separate config objects`)
  }

  // Check for extends (beyond kaliber — warn)
  if (config.extends) {
    const extends_ = Array.isArray(config.extends) ? config.extends : [config.extends]
    const nonKaliber = extends_.filter(e => !e.includes('@kaliber'))
    if (nonKaliber.length > 0) {
      warnings.push(`'extends' found with non-Kaliber configs: ${nonKaliber.join(', ')} — migrate manually`)
    }
  }

  // Check for ignorePatterns
  let ignorePatterns = null
  if (config.ignorePatterns) {
    ignorePatterns = Array.isArray(config.ignorePatterns)
      ? config.ignorePatterns
      : [config.ignorePatterns]
  }

  return {
    overrideRules,
    customGlobals,
    ignorePatterns,
    warnings,
  }
}

// ── Output generation ────────────────────────────────────────────────

function generateOutput({ overrideRules, customGlobals, ignorePatterns }) {
  const lines = []

  lines.push(`const kaliberConfig = require('@kaliber/eslint-plugin/eslint.config')`)

  const hasCustomGlobals = Object.keys(customGlobals).length > 0
  const hasOverrideRules = Object.keys(overrideRules).length > 0
  const hasIgnorePatterns = ignorePatterns && ignorePatterns.length > 0
  const hasOverrides = hasCustomGlobals || hasOverrideRules

  lines.push('')
  lines.push('module.exports = [')
  lines.push('  ...kaliberConfig,')

  if (hasOverrides) {
    lines.push('  {')

    if (hasCustomGlobals) {
      lines.push('    languageOptions: {')
      lines.push('      globals: {')
      for (const [name, value] of Object.entries(customGlobals)) {
        lines.push(`        ${formatKey(name)}: ${formatValue(value)},`)
      }
      lines.push('      },')
      lines.push('    },')
    }

    if (hasOverrideRules) {
      lines.push('    rules: {')
      for (const [rule, value] of Object.entries(overrideRules)) {
        lines.push(`      '${rule}': ${formatValue(value)},`)
      }
      lines.push('    },')
    }

    lines.push('  },')
  }

  if (hasIgnorePatterns) {
    lines.push('  {')
    lines.push(`    ignores: [${ignorePatterns.map(p => `'${p}'`).join(', ')}],`)
    lines.push('  },')
  }

  lines.push(']')
  lines.push('')

  return lines.join('\n')
}

// ── Helpers ──────────────────────────────────────────────────────────

function formatKey(key) {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `'${key}'`
}

function formatValue(value) {
  if (typeof value === 'string') return `'${value}'`
  if (Array.isArray(value)) {
    return `[${value.map(formatValue).join(', ')}]`
  }
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value).map(
      ([k, v]) => `${formatKey(k)}: ${formatValue(v)}`
    )
    return `{ ${entries.join(', ')} }`
  }
  return String(value)
}

function normalizeGlobalValue(value) {
  if (value === true || value === 'writable') return 'writable'
  if (value === false || value === 'readonly') return 'readonly'
  if (value === 'off') return 'off'
  return 'readonly'
}

function deepEqual(a, b) {
  if (a === b) return true
  if (typeof a !== typeof b) return false
  if (a === null || b === null) return a === b
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((val, i) => deepEqual(val, b[i]))
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a)
    const keysB = Object.keys(b)
    if (keysA.length !== keysB.length) return false
    return keysA.every(key => deepEqual(a[key], b[key]))
  }
  return false
}

function parseFlags(args) {
  const flags = {}
  for (const arg of args) {
    if (arg === '--help' || arg === '-h') flags.help = true
    else if (arg === '--dry-run') flags.dryRun = true
    else if (arg === '--stdout') flags.stdout = true
    else if (arg === '--force') flags.force = true
    else if (!arg.startsWith('-')) flags.cwd = path.resolve(arg)
  }
  return flags
}

function printUsage() {
  console.log(`
Usage: kaliber-eslint-migrate [options] [directory]

Migrate a legacy .eslintrc file to ESLint v9 flat config format.
Tailored for Kaliber projects using @kaliber/eslint-plugin.

Options:
  --dry-run   Preview the output without writing any files
  --stdout    Print the generated config to stdout
  --force     Overwrite an existing eslint.config.js
  -h, --help  Show this help message

Examples:
  kaliber-eslint-migrate                  # migrate in current directory
  kaliber-eslint-migrate ./my-project     # migrate in specific directory
  kaliber-eslint-migrate --dry-run        # preview without writing
  kaliber-eslint-migrate --stdout         # pipe to another tool
`.trim())
}

// ── Exports for testing ──────────────────────────────────────────────

module.exports = { migrate, generateOutput, findConfig, stripJsonComments }

// Run when executed directly
if (require.main === module) {
  main()
}
