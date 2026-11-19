# Detect non-literal RegExp

Flags `new RegExp()` and `RegExp()` calls where the pattern argument is not a static string literal. Dynamic regular expressions built from user input can lead to **ReDoS (Regular Expression Denial of Service)** attacks.

## Examples

Examples of *correct* code for this rule:

```js
new RegExp('abc')
/abc/
new RegExp(`static`)
RegExp('literal')
```

Examples of *incorrect* code for this rule:

```js
new RegExp(variable)
new RegExp(getUserInput())
RegExp(variable)
```
