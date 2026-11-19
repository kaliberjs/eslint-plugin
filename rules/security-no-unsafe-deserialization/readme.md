# No unsafe deserialization

Detects unsafe deserialization patterns that can lead to remote code execution. Flags `eval()` with string concatenation (common unsafe JSON parse pattern), `new Function()` with non-literal arguments, and calls to `unserialize()`/`deserialize()`.

## Examples

Examples of *correct* code for this rule:

```js
JSON.parse(data)
new Function('return 1')
eval('1 + 1')
```

Examples of *incorrect* code for this rule:

```js
eval('(' + data + ')')
new Function(data)
unserialize(input)
deserialize(buffer)
```
