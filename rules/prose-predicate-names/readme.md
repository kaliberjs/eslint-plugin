# Prose: predicate names

Boolean values and helpers should read as questions. When a function or variable
is obviously boolean-shaped, its name should say so.

## Correct

```js
function isExpired(subscription) {
  return subscription.age > GRACE_PERIOD_DAYS
}

const hasItems = items => items.length > 0
const canSubmit = isValid(form) && hasAcceptedTerms(form)
```

## Incorrect

```js
function expired(subscription) {
  return subscription.age > GRACE_PERIOD_DAYS
}

const valid = value => value !== null
const ready = isReady(user)
```

## Options

```js
{
  prefixes: ['is', 'has', 'can', 'should', 'was']
}
```
