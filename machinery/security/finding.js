const DEFAULTS = {
  minConfidence: 0.5,
  maxHops: 12,
  callDepth: 0,
  maxPathInMessage: 6,
  registry: { sources: [], sinks: [], sanitizers: [] },
}

/**
 * Severity is impact if exploited; confidence is how sure the analysis is.
 * They are separate axes and this table is the only place they meet.
 * `false` means: computed, but not worth a developer's attention.
 */
const REPORTABLE = {
  high:   { high: true, medium: true,  low: false },
  medium: { high: true, medium: true,  low: false },
  low:    { high: true, medium: false, low: false },
}

module.exports = {
  report,
  confidenceBucket,
  describePath,
  explainConfidence,
  settings,
  DEFAULTS,
}

/**
 * Report a taint finding unless its severity/confidence combination is below
 * the floor. Rules never decide this themselves, and never format flow paths.
 *
 * @returns {boolean} whether it reported
 */
function report(context, { node, messageId, data = {}, severity, confidence, path = [] }) {
  const options = settings(context)

  if (confidence < options.minConfidence) return false

  const bucket = confidenceBucket(confidence)
  if (!REPORTABLE[severity]?.[bucket]) return false

  context.report({
    node,
    messageId,
    data: {
      ...data,
      flow: describePath(context.sourceCode, path, options.maxPathInMessage),
      confidence: bucket,
      why: explainConfidence(path),
    },
  })

  return true
}

/** @returns {'high' | 'medium' | 'low'} */
function confidenceBucket(confidence) {
  if (confidence >= 0.8) return 'high'
  if (confidence >= 0.5) return 'medium'
  return 'low'
}

/**
 * 'req.query.id -> id -> `...${id}` -> db.query(...)'
 *
 * Long paths are elided in the middle: a twelve-hop path in an error message is
 * noise, and the full path stays on the TaintValue for tests to assert against.
 */
function describePath(sourceCode, path, maxHops = DEFAULTS.maxPathInMessage) {
  const labels = path.map(hop => hop.label || oneLine(sourceCode.getText(hop.node)))

  if (labels.length <= maxHops) return labels.join(' -> ')

  const head = labels.slice(0, Math.ceil((maxHops - 1) / 2))
  const tail = labels.slice(-Math.floor((maxHops - 1) / 2))
  return [...head, `… ${labels.length - head.length - tail.length} more`, ...tail].join(' -> ')
}

/**
 * Why a finding is not high confidence, derived from the hops that actually
 * cost something. Generated, never written per rule — a rule author cannot know
 * which hops the analysis was unsure about.
 */
function explainConfidence(path) {
  const inexact = path
    .filter(hop => hop.penalty > 0)
    .sort((a, b) => b.penalty - a.penalty)
    .map(hop => REASON[hop.kind])
    .filter(Boolean)

  return [...new Set(inexact)].slice(0, 2).join(', ')
}

const REASON = {
  member: 'property access',
  computedMember: 'computed property access',
  template: 'template literal interpolation',
  concat: 'string concatenation',
  methodName: 'a method matched by name without type information',
  ternary: 'a conditional where one branch may be safe',
  logical: 'a logical operator where one branch may be safe',
  multiWrite: 'a variable assigned more than once',
  param: 'a function parameter',
  return: 'a function return value',
  multiCallSite: 'several call sites with differing arguments',
  unknownCall: 'a partially understood function call',
}

/** Merged defaults + `settings['@kaliber/security']`. */
function settings(context) {
  const configured = context.settings?.['@kaliber/security'] ?? {}
  return {
    ...DEFAULTS,
    ...configured,
    registry: { ...DEFAULTS.registry, ...configured.registry },
  }
}

function oneLine(text) {
  const collapsed = text.replace(/\s+/g, ' ').trim()
  return collapsed.length > 40 ? `${collapsed.slice(0, 39)}…` : collapsed
}
