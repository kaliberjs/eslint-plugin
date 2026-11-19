# Detect object injection

Detects variable bracket access on objects (`obj[variable]`), which can enable prototype pollution. When user-controlled input is used as a key in bracket notation, an attacker can inject keys like `__proto__`, `constructor`, or `prototype` to modify the object's prototype chain and potentially execute arbitrary code.

## Examples

Examples of *correct* code for this rule:

```js
obj['literal']
obj[0]
arr[1]
obj.property
```

Examples of *incorrect* code for this rule:

```js
obj[key]
data[userInput]
config[name]
```
