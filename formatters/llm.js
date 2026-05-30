/**
 * ESLint formatter that enriches error output with rule documentation.
 *
 * Usage:
 *   eslint --format @kaliber/eslint-plugin/formatters/llm src/
 *
 * For each violation, this formatter appends the rule's `meta.docs.description`
 * and `meta.docs.url` below the standard error line. This gives AI coding
 * assistants immediate context about *why* a rule exists and where to find
 * the full documentation — without needing to follow links or query external
 * services.
 */
module.exports = function(results, context) {
  const { rulesMeta } = context
  let output = ''
  let totalErrors = 0
  let totalWarnings = 0

  for (const result of results) {
    const { messages } = result
    if (!messages.length) continue

    output += `\n${result.filePath}\n`

    for (const msg of messages) {
      const severity = msg.severity === 2 ? 'error' : 'warning'
      output += `  ${msg.line}:${msg.column}  ${severity}  ${msg.message}  ${msg.ruleId}\n`

      const meta = msg.ruleId && rulesMeta[msg.ruleId]
      if (meta && meta.docs) {
        if (meta.docs.description) {
          output += `    → ${meta.docs.description}\n`
        }
        if (meta.docs.url) {
          output += `    → ${meta.docs.url}\n`
        }
      }
    }

    totalErrors += result.errorCount
    totalWarnings += result.warningCount
  }

  if (totalErrors || totalWarnings) {
    output += `\n✖ ${totalErrors + totalWarnings} problems (${totalErrors} errors, ${totalWarnings} warnings)\n`
  }

  return output
}
