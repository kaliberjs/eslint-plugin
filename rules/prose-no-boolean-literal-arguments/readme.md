# Prose: no boolean literal arguments

Bare boolean arguments make the reader jump to the function signature to learn what
`true` or `false` means.

Use a named options object instead.

## Correct

```js
fetchUser(id, { includeInactive: true })
renderDialog({ trapFocus: false })
```

## Incorrect

```js
fetchUser(id, true)
renderDialog(false)
```

## Options

```js
{
  allowCallees: ['Boolean']
}
```

`allowCallees` accepts fully-qualified callee names such as `Boolean` or
`expect.toBe`.
