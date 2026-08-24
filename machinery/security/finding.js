const DEFAULTS = {
  minConfidence: 0.5,
  maxHops: 12,
  callDepth: 0,
  maxPathInMessage: 6,
  registry: { sources: [], sinks: [], sanitizers: [] },
  // Base directory root-slash imports (`/machinery/x`) resolve against.
  // null means: guess from the nearest ancestor package.json's `src`
  // directory (see taint.js#findDefaultSourceRoot). Set this explicitly
  // for a project laid out differently.
  sourceRoot: null,
}

/**
 * Severity is impact if exploited; confidence is how sure the analysis is.
 * They are separate axes and this table is the only place they meet.
 * `false` means: computed, but not worth a developer's attention.
 */
const REPORTABLE = {
  critical: { high: true, medium: true,  low: false },
  high:     { high: true, medium: true,  low: false },
  medium:   { high: true, medium: true,  low: false },
  low:      { high: true, medium: false, low: false },
}

const SEVERITIES = Object.keys(REPORTABLE)

module.exports = {
  report,
  reportReachableSinks,
  SEVERITIES,
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

  // An unrecognised severity previously made `REPORTABLE[severity]?.[bucket]`
  // undefined, so the finding was silently dropped. A consumer registering a
  // sink with a severity this table does not know would have got zero findings
  // and no diagnostic — the worst possible failure for a security tool, because
  // it is indistinguishable from having no vulnerabilities.
  if (!REPORTABLE[severity]) throw new Error(`security: unknown severity '${severity}'. Known severities: ${SEVERITIES.join(', ')}`)

  if (confidence < options.minConfidence) return false

  const bucket = confidenceBucket(confidence)
  if (!REPORTABLE[severity][bucket]) return false

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

/**
 * Report every sink reachable inside a called function's body, given a call
 * site with tainted arguments — the delegate-to-a-data-layer shape that
 * `report()` alone cannot see, because the sink node it would anchor to may
 * not even belong to this file's AST. Reports always anchor at `node` (the
 * call site), never at the sink itself, for exactly that reason.
 *
 * `filter(sink, taint, sinkNode)` exists for sink kinds shared by two rules
 * (e.g. 'path' for both no-path-traversal and no-firebase-path-injection) so
 * each only reports the sink family it owns, and for a rule that needs to
 * inspect the actual call reached (`sinkNode.arguments[sink.argument]`) to
 * rule out a same-name, different-thing collision.
 */
function reportReachableSinks(context, analysis, node, kind, messageId, qualifiedMessageId, filter) {
  for (const { sink, taint, sinkLabel, sinkNode } of analysis.reachableSinksOf(node, kind)) {
    if (filter && !filter(sink, taint, sinkNode)) continue

    const qualify = taint.confidence < 0.8 && explainConfidence(taint.path)

    report(context, {
      node,
      messageId: qualify ? qualifiedMessageId : messageId,
      data: { sink: sinkLabel },
      severity: sink.severity,
      confidence: taint.confidence,
      path: [...taint.path, { node, kind: 'sink', label: sinkLabel, penalty: 0 }],
    })
  }
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
 *
 * This also decides whether a rule emits its "qualified" message variant.
 * The contract, which every taint-based rule follows:
 *
 *   confidence < 0.8 AND at least one hop has penalty > 0  -> qualified message
 *
 * Both conditions matter. A flow that is exact all the way down (every hop
 * penalty 0) can land below 0.8 purely through the source's own confidence —
 * there is nothing to explain, so the plain message fires. And an inexact
 * hop at 0.9 confidence needs no apology either. Rules that get this wrong
 * produce messages with a hole where the reason should be ("passes through .").
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
