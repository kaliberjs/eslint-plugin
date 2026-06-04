# todo-ticket-reference

Enforces that all `TODO` comments include a Jira ticket reference.

## Rule details

This rule flags any comment containing `TODO` (case-insensitive) that does not reference a Jira ticket in the format `TODO (KEY-123): description`.

### Configuration

The rule requires a `projectKeys` option — an array of accepted Jira project keys:

```json
"@kaliber/todo-ticket-reference": ["warn", { "projectKeys": ["LAN"] }]
```

Multiple keys are supported:

```json
"@kaliber/todo-ticket-reference": ["warn", { "projectKeys": ["LAN", "CORE"] }]
```

### ✅ Valid

```js
// TODO (LAN-123): fix this
// TODO LAN-456: refactor this
/* TODO (CORE-99): update later */
// FIXME: not a TODO, not checked
```

### ❌ Invalid

```js
// TODO fix this
// TODO: fix this
/* TODO blah blah */
// TODO (WRONG-1): unknown project key
```
