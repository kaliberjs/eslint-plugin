const fs = require('node:fs')
const postcss = require('postcss')

/**
 * The class names a CSS Module exports, read from the stylesheet itself.
 *
 * Nesting is the reason this uses a real parser: `& > .iconWrapperLayout` is a class the module
 * exports, and a checker that does not read it reports every use of it as undefined. Getting that
 * wrong in the quiet direction is worse — a stylesheet it fails to understand must come back as
 * an error, never as a stylesheet without classes.
 */

const cache = new Map()

module.exports = { classesOf }

function classesOf(file) {
  const stats = statOf(file)
  if (!stats) return { classes: null, error: 'no such file' }

  const cached = cache.get(file)
  if (cached && cached.mtimeMs === stats.mtimeMs && cached.size === stats.size) return cached.result

  const result = read(file)
  cache.set(file, { mtimeMs: stats.mtimeMs, size: stats.size, result })
  return result
}

function read(file) {
  let root
  try {
    root = postcss.parse(fs.readFileSync(file, 'utf8'), { from: file })
  } catch (e) {
    return { classes: null, error: e.reason ?? e.message }
  }

  const classes = new Set()
  root.walkRules(rule => {
    // A selector inside `@keyframes` is a percentage or a keyword, and the animation name it
    // sits under is not something a component can reach through the styles object.
    if (rule.parent?.type === 'atrule' && rule.parent.name.endsWith('keyframes')) return
    for (const name of classNamesIn(rule.selector)) classes.add(name)
  })
  return { classes, error: null }
}

/**
 * `:global(.legacy)` is deliberately absent: css-loader leaves a global class where it is and
 * exports nothing for it, so `styles.legacy` is undefined and saying otherwise would hide the
 * one case this rule exists to find.
 */
function classNamesIn(selector) {
  const withoutStrings = selector.replace(/'[^']*'|"[^"]*"/g, '')
  const withoutGlobals = withoutStrings.replace(/:global\s*\([^)]*\)/g, '')
  return [...withoutGlobals.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map(([, name]) => name)
}

function statOf(file) {
  try {
    return fs.statSync(file)
  } catch {
    return null
  }
}
