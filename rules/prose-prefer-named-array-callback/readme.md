# Prose: prefer named array callback

Collection operations should read as a sentence. Inline callbacks are fine for
single-property access, but compound filtering or transformation should have a
name.

## Correct

```js
const activeDocuments = documents.filter(isActiveDocument)
const names = users.map(user => user.name)
const selectedItem = items.find(item => item.active)
```

## Incorrect

```js
const activeDocuments = documents.filter(
  document => document.type && document.status === 'active' && !document.archived
)

const cards = documents.map(document => ({
  title: document.title,
  href: document.url,
}))
```
