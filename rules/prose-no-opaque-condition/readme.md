# Prose: no opaque condition

Branches should read as intent. If a condition asks the reader to decode
comparisons, nested properties, or a chain of clauses, extract it into a named
predicate.

## Correct

```js
if (isMissingDocumentType(response)) return
if (isReady(user) && canSubmit(form) && hasAccount(account)) return
if (value === null) return
if (typeof value === 'string') return
if (status === 'active') return
if (filters.sub_expertise.length) return
```

## Incorrect

```js
if (!response.data._type) return
if (user && user.role === 'admin' && user.active && !user.suspended) grantAccess()
if (user.permissions.write && user.preferences.notifications.email) notify(user)
```

## Options

```js
{
  maxLength: 60,
  maxNamedPredicateClauses: 3,
  ignoreForLoopTests: true,
  ignoreTypeofComparisons: true
}
```

Small logical expressions made only from named predicates are allowed by default
(up to 3 clauses). Longer chains should get their own name. Simple comparisons
against literals (`status === 'active'`) and `.length` access at any depth
are always considered readable.

