# firebase-other-required

Requires a `$other` rule with `.validate` beside validated Firebase fields a client can write, so
the client can't write other keys next to them.
[CWE-915](https://cwe.mitre.org/data/definitions/915.html)

## Rule details

Validating `email` and `language` says nothing about keys that aren't listed; a client can still
write `isAdmin` beside them. A `$` wildcard with a `.validate` covers every key that isn't
listed. Firebase calls it
[`$other`](https://firebase.google.com/docs/database/security/rules-conditions).

Reports an object with at least one validated field and no `$` key whose rule has a `.validate`,
when a `.write` on it or above it lets some client in. Nodes only a service writes, and objects
without validated fields (path trees with `.read` and `.write`), aren't checked.

```js
// ✗
$key: { email: isString(), language: isString() }

// ✓
$key: { email: isString(), language: isString(), '$other': validate(false) }
```

`validate(isService)` instead of `validate(false)` lets only that service write other keys.

## Options

- `env`: as in
  [firebase-client-writable-trust-path](../firebase-client-writable-trust-path/readme.md#options).

## Limitations

- A `$other` rule that can't be folded, such as an imported helper, is trusted.
- Shapes built by a helper function are checked, with their path starting at that function.
