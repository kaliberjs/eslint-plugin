# Detect eval() with expression

Flags `eval()` calls where the argument is not a static string literal. Passing dynamic expressions to `eval()` allows arbitrary code execution and is a critical security risk.

## Examples

Examples of *correct* code for this rule:

```js
eval('alert(1)')
eval(`static`)
```

Examples of *incorrect* code for this rule:

```js
eval(userInput)
eval(getValue())
eval(a + b)
```
