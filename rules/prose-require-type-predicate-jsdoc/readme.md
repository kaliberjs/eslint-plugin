# Prose: require type predicate JSDoc

When a function is named as a type guard (`isUser`, `hasPermissions`, `canEdit`),
its JSDoc should declare it as a TypeScript-style type predicate using
`@returns {paramName is TypeName}`. This makes the contract explicit and enables
type narrowing for tools that understand JSDoc.

This rule complements [`prose-predicate-names`](../prose-predicate-names/readme.md):
that rule ensures boolean-returning functions *have* a predicate name; this rule
ensures predicate-named functions *have* the right JSDoc.

## Correct

```js
/** @returns {value is User} */
function isUser(value) {
  return value && value.type === 'user'
}

/** @returns {item is ActiveItem} */
const isActive = (item) => item.status === 'active'

/** @returns {obj is WithPermissions} */
function hasPermissions(obj) {
  return Boolean(obj.permissions)
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

## Notes

- Functions with zero parameters are ignored — type predicates need a subject
  to narrow.
- Non-predicate-named functions are not checked — use `prose-predicate-names`
  to enforce naming.
- Both `@returns` and `@return` are accepted.
