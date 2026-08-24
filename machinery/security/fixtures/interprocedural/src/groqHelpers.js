export function runQuery(slug) {
  return client.fetch(groq`*[slug.current == "${slug}"]`)
}

export function runQueryString(query) {
  return client.fetch(query)
}

export const postFields = groq`{ title, slug }`
