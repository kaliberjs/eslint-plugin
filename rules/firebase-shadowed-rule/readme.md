# firebase-shadowed-rule

Disallows a Firebase Realtime Database `.read` or `.write` that narrows what an ancestor already grants, which has no effect.

- **CWE:** [CWE-284: Improper Access Control](https://cwe.mitre.org/data/definitions/284.html)
- **OWASP:** [A01:2025 – Broken Access Control](https://owasp.org/Top10/2025/A01_2025-Broken_Access_Control/) · [A01:2021 – Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/) (previous edition)

## Rule details

`.read` and `.write` cascade: once a rule grants access to a node, a rule below
it cannot take that access away. The rule reports a `.read` or `.write` that is
narrower than one an ancestor grants unconditionally:

- the ancestor grants `true`, and the child does not;
- or the ancestor grants exactly `auth != null`, and the child grants less;
- or the child is `false` and the ancestor grants anything at all. Whenever
  the ancestor's condition holds, the child is ignored; this is the example in
  Firebase's [Avoid insecure rules](https://firebase.google.com/docs/database/security/resolve-insecurities).

The narrower rule reads like a restriction and restricts nothing. `.validate`
does not cascade and is not checked
([core syntax](https://firebase.google.com/docs/database/security/core-syntax)).

Values are folded as in
[firebase-client-writable-trust-path](../firebase-client-writable-trust-path/readme.md).

## Incorrect

```js
module.exports = () => ({ rules: { static: {
  '.read': true,
  questionnaires: { '.read': "auth.uid === 'serve'" },
} } })
```

Anyone reads `static/questionnaires`.

## Correct

```js
module.exports = () => ({ rules: { static: {
  skills: { '.read': true },
  questionnaires: { '.read': "auth.uid === 'serve'" },
} } })
```

Grant the open read on the children that are public, not on their parent.

## Options

- `env`: values for `process.env.X`, as in
  [firebase-client-writable-trust-path](../firebase-client-writable-trust-path/readme.md#options).

## Limitations

- Ancestors are followed through object literals up to the enclosing function.
  A subtree built by a helper function and an ancestor in the caller are not
  connected.
- Below an ancestor that grants on a condition, only a child `false` is
  reported. A narrower condition there may still apply when the ancestor's
  does not, so it is left alone.
- The checks are textual, on the folded rule expression.

## References

- [Rules cascade](https://firebase.google.com/docs/database/security/core-syntax#read_and_write_rules_cascade)
