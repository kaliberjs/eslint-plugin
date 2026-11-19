# Detect new Buffer() with non-literal arguments

Flags `new Buffer()` calls where the argument is not a static literal. The deprecated `Buffer` constructor with non-literal arguments can lead to memory disclosure vulnerabilities. Use `Buffer.alloc()` or `Buffer.from()` instead.

## Examples

Examples of *correct* code for this rule:

```js
new Buffer(10)
new Buffer('hello')
Buffer.alloc(size)
Buffer.from(data)
```

Examples of *incorrect* code for this rule:

```js
new Buffer(variable)
new Buffer(getSize())
```
