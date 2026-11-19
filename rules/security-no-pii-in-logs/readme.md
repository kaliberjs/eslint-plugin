# No PII in logs

Detects logging of potentially personally identifiable information (PII). Flags calls to `console.log()`, `logger.info()`, etc. where argument names match known PII field names like `email`, `ssn`, `creditCard`, `phone`, `passport`, etc.

## Examples

Examples of *correct* code for this rule:

```js
console.log('Request received')
console.log(username)
logger.info(count)
```

Examples of *incorrect* code for this rule:

```js
console.log(email)
logger.info(ssn)
console.error(creditCard)
console.debug(phoneNumber)
```
