# Detect disabled mustache escaping

Flags assignments like `object.escapeMarkup = false` which disable HTML entity escaping in template engines. Disabling escaping can lead to Cross-Site Scripting (XSS) vulnerabilities.

## Examples

Examples of *correct* code for this rule:

```js
obj.escapeMarkup = true
obj.escapeMarkup = fn()
obj.otherProp = false
```

Examples of *incorrect* code for this rule:

```js
obj.escapeMarkup = false
config.escapeMarkup = false
```
