const dir = new URLSearchParams(location.search).get('d')

export const frag = groq`slug.current == "${dir}"`
