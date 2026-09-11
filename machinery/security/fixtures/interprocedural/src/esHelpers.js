// Fixtures for no-elasticsearch-injection's adversarial corpus: a helper that
// builds the DSL shape, and one that contains the sink call itself.
export function buildQueryString(text) {
  return { query_string: { query: text } }
}

export function searchByText(text) {
  return client.search({ query: { query_string: { query: text } } })
}

export function scoreByExpression(expr) {
  return client.search({ query: { script_score: { script: { source: expr } } } })
}
