# Prose: prefer named array callback

Collection operations should read as a sentence. Inline callbacks are fine for
projections and simple comparisons, but compound filtering or complex
transformation should have a name.

## Correct

```js
const activeDocuments = documents.filter(isActiveDocument)
const names = users.map(user => user.name)
const selectedItem = items.find(item => item.active)
const cards = items.map(item => ({ id: item.id, name: item.name }))
const recent = items.find(item => item.status === 'active')
const titles = items.map(item => item.details.title)
```

## Incorrect

```js
const activeDocuments = documents.filter(
  document => document.type && document.status === 'active' && !document.archived
)

const enriched = items.map(item => ({
  ...item,
  label: getLabel(item),
}))
```

Simple object projections (all literal keys, no spreads, no computed values)
and single comparisons are allowed inline. `.map()` callbacks are exempt from
the nested member-expression check since data projection inherently reaches
into structure.

