# firebase-service-shape

Recommends `$other` and `newData.hasChildren()` on Firebase data only our own code writes, as for
data users write. Best practice, not a hole.

## Rule details

Data only a service or the server (`serve`) writes can't be abused by users: what lands there
comes from our own code. Its shape still deserves the same care, because a bug in that code
writes just as freely. This rule runs the checks of
[firebase-other-required](../firebase-other-required/readme.md) and
[firebase-children-required](../firebase-children-required/readme.md) on that data, as a warning:

- an `$other` with a `.validate`: the service's own check on its records, `false` inside them;
- `'.validate': 'newData.hasChildren()'` on objects with validated fields and no `.validate` of
  their own; one that has its own (`isService || (isSite && isDelete())`) was validated on
  purpose and is left alone.

Data a `.write` opens to users is left to those two rules, as errors.

```js
// ✓ a record the service and the server write
$subscriptionId: {
  '.write': `${isJobAlertSubscriptionService} || ${isSite}`,
  '.validate': 'newData.hasChildren()',
  formValues: {
    email: isString(), '$other': validate(false), '.validate': 'newData.hasChildren()',
  },
  '$other': validate(isJobAlertSubscriptionService),
}
```

Fixable with `--fix`, as the two rules it follows.
