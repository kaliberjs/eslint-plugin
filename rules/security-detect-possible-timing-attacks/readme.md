# Detect possible timing attacks

Detects insecure comparisons of security-sensitive values that may be vulnerable to timing attacks. Standard equality operators (`===`, `!==`, `==`, `!=`) compare strings byte-by-byte and return early on the first mismatch, leaking information about how many characters matched. Attackers can exploit this timing difference to guess secrets one character at a time. Use `crypto.timingSafeEqual()` instead for constant-time comparison.

## Examples

Examples of *correct* code for this rule:

```js
username === input
count === 0
name == 'admin'
crypto.timingSafeEqual(Buffer.from(password), Buffer.from(input))
```

Examples of *incorrect* code for this rule:

```js
password === input
token !== expected
hash == value
secret != other
auth === check
```
