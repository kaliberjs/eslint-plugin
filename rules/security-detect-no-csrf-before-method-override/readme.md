# Detect csrf before method-override

Flags Express middleware chains where `csrf()` is registered before `methodOverride()`. When `method-override` comes after CSRF protection, an attacker can change the HTTP method of a request (e.g. from POST to DELETE) **after** the CSRF check has already passed, effectively **bypassing CSRF protection**.

## Examples

Examples of *correct* code for this rule:

```js
app.use(methodOverride())
app.use(csrf())
```

Examples of *incorrect* code for this rule:

```js
app.use(csrf())
app.use(methodOverride())
```
