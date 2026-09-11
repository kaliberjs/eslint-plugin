/**
 * Fixtures for no-ssrf's adversarial corpus: helpers that contain the
 * outbound-request sink, in the spellings a data layer actually uses.
 */
export function fetchUrl(url) {
  return fetch(url)
}

export function fetchFromHost(host) {
  return fetch(`https://${host}/v1/items`)
}

export const client = {
  get(url) { return fetch(url) },
}

export default function proxy(url) {
  return fetch(url)
}
