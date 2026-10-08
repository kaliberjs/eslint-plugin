# firebase-children-required

Requires `newData.hasChildren()` on validated Firebase objects a client can write, so a string or
number written in their place doesn't skip every field rule.
[CWE-20](https://cwe.mitre.org/data/definitions/20.html)

## Rule details

Field rules only run on children that exist. A primitive has no children, so writing
`"anything"` where a queue task belongs passes `uid: isString()`, `email: isString()` and
`$other` alike. A worker that reads the task as an object then crashes on it, and a queue worker
that crashes on its first task stops processing the rest. Firebase
[checks the shape](https://firebase.google.com/docs/database/security/rules-conditions)
with `newData.hasChildren()` in the object's own `.validate`.

Reports an object with at least one validated field and no `.validate` of its own that calls
`newData.hasChildren`, when a `.write` on it or above it lets some client in.

```js
// ✗
$key: { '.write': 'auth != null && newData.exists() && !data.exists()', email: isString() }

// ✓
$key: {
  '.write': 'auth != null && newData.exists() && !data.exists()',
  '.validate': "newData.hasChildren(['email'])",
  email: isString(),
}
```

## Limitations

- A `.validate` that can't be folded, such as an imported helper, is trusted.
- It checks that `hasChildren` is called, not which fields it lists.
