# firebase-other-required

Requires a `$other` rule with `.validate` beside validated Firebase fields a client can write, so
the client can't write other keys next to them.
[CWE-915](https://cwe.mitre.org/data/definitions/915.html)

## Rule details

Validating `email` and `language` says nothing about keys that aren't listed; a client can still
write `isAdmin` beside them. A `$` wildcard with a `.validate` covers every key that isn't
listed. Firebase calls it
[`$other`](https://firebase.google.com/docs/database/security/rules-conditions).

Reports an object with validated fields a client can write and no `$` key whose rule has a
`.validate`. Inside `services/<name>` it also checks what `$other` lets in:

- the task record (the first `$` wildcard, a queue's `$key`): only that service, so its worker
  can write its own keys such as `_state`. It uses the `const` named after the service,
  `isJobAlertSubscriptionService` for `auth.uid === 'job-alert-subscription-service'`;
- data inside the record (`formValues`, `filters`): nobody, `validate(false)`.

A job-alert subscription shows the shape:

```js
// ✓
$subscriptionId: {
  language: isString(),
  formValues: { email: isString(), '$other': validate(false) },
  '$other': validate(isJobAlertSubscriptionService),
}

// ✗ data the client writes, opened to the service
filters: { jobFamily: isString(), '$other': validate(isJobAlertSubscriptionService) }
```

Fixable: `--fix` adds or corrects `$other`, using the file's `validate()` helper when it has one.
It leaves a record without a named service check alone, because `false` there would also lock out
the worker that processes it.

## Limitations

- A `$other` rule that can't be folded, such as an imported helper, is trusted.
- Shapes built by a helper function are checked, with their path starting at that function.
