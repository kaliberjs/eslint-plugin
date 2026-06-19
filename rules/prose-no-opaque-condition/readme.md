# Prose: no opaque condition

Branches should read as intent. If a condition asks the reader to decode
comparisons, nested properties, or a chain of clauses, extract it into a named
predicate.

## Correct

```js
if (isMissingDocumentType(response)) return
if (isReady(user) && canSubmit(form)) submitForm()
if (value === null) return
```

## Incorrect

```js
if (!response.data._type) return
if (daysSinceRenewal > gracePeriodDays) cancelSubscription(user)
if (user && user.role === 'admin' && user.active && !user.suspended) grantAccess()
```

## Options

```js
{
  maxLength: 60,
  maxNamedPredicateClauses: 2
}
```

Small logical expressions made only from named predicates are allowed by default.
Longer chains should get their own name.
