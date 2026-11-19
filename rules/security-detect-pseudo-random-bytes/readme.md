# Detect crypto.pseudoRandomBytes()

Flags calls to `crypto.pseudoRandomBytes()` which is not cryptographically strong. Use `crypto.randomBytes()` instead for generating secure random data.

## Examples

Examples of *correct* code for this rule:

```js
crypto.randomBytes(32)
obj.randomBytes(16)
```

Examples of *incorrect* code for this rule:

```js
crypto.pseudoRandomBytes(32)
obj.pseudoRandomBytes(16)
```
