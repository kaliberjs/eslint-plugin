# No insecure random

Flags `Math.random()` usage which is not cryptographically secure. For security-sensitive operations like generating tokens, IDs, or secrets, use `crypto.randomBytes()` or `crypto.randomUUID()` instead.

## Examples

Examples of *correct* code for this rule:

```js
crypto.randomBytes(32)
crypto.randomUUID()
getRandomValue()
```

Examples of *incorrect* code for this rule:

```js
Math.random()
const x = Math.random()
const id = String(Math.random()).slice(2)
```
