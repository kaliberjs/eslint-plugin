# Prose: require type predicate JSDoc

When a predicate-named function narrows a value's type (`isUser`, `isElement`,
`hasId`), its JSDoc should declare it as a TypeScript-style type predicate using
`@returns {paramName is TypeName}`. This makes the contract explicit and enables
type narrowing for tools that understand JSDoc.

This rule complements [`prose-predicate-names`](../prose-predicate-names/readme.md):
that rule ensures boolean-returning functions *have* a predicate name; this rule
ensures type guards *have* the right JSDoc.

## Correct

```js
/** @returns {value is User} */
function isUser(value) {
  return value && value.type === 'user'
}

/** @returns {value is string} */
function isString(value) {
  return typeof value === 'string'
}

/** @returns {value is WithId} */
function hasId(value) {
  return 'id' in value
}
```

## Incorrect

```js
// No JSDoc at all
function isUser(value) {
  return value && value.type === 'user'
}

// JSDoc without type predicate
/** @returns {boolean} */
function isUser(value) {
  return value && value.type === 'user'
}

// Description only, no @returns
/** Checks if value is a user */
function isUser(value) {
  return value && value.type === 'user'
}
```

## Ignored

```js
function isExpired(subscription) {
  return subscription.age > 30
}

function canEdit(user) {
  return user.role === 'admin'
}
```

## Notes

- Functions with zero parameters are ignored — type predicates need a subject
  to narrow.
- Domain predicates that do not narrow a value's type are ignored.
- Non-predicate-named functions are not checked — use `prose-predicate-names`
  to enforce naming.
- Both `@returns` and `@return` are accepted.
