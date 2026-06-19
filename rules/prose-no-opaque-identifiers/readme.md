# Prose: no opaque identifiers

Names are the prose of code. Short placeholders and generic abbreviations force
the reader to keep a mental dictionary.

## Correct

```js
const currentUser = getUser()
const applicationConfig = loadConfig()
function renderArticle(article) {}
const { retryLimit, timeoutMs } = getConfig()
```

## Incorrect

```js
const u = getUser()
const cfg = loadConfig()
function render(p) {}
const { a, b } = getConfig()
```

## Options

```js
{
  minLength: 2,
  allowedNames: ['x'],
  bannedNames: ['data'],
  allowLoopIndexes: true
}
```

Loop indexes `i`, `j`, and `k` are allowed by default only in `for` statement
initializers.
