# Prose: no explanatory condition comments

Comments that restate what a condition checks are noise. If the condition needs
explaining, extract it into a named predicate — the name becomes the
documentation.

Detected prefixes include "check if", "verify that", "ensure that",
"render if", "show when", and similar patterns.

Tool comments (`eslint`, `TODO`, `FIXME`, `@ts-`, etc.) are always ignored.

## Correct

```js
// TODO: refactor this check
if (user.active) return

// Why: business requirement from PROJ-123
if (status === 'active') return

if (isActiveUser(user)) return
```

## Incorrect

```js
// Check if the user is active
if (user.active) return

// Verify that the form is valid
if (isValid(form)) submit()

// Show if user has permissions
if (hasPermissions(user)) showPanel()

// Ensure that the value is present
while (getValue()) continue
```

## When Not To Use It

If your team uses condition comments as a deliberate documentation strategy, or
if you are incrementally adopting the prose rules and want to defer this one.
