# No unsafe innerHTML

Detects unsafe `innerHTML` and `outerHTML` assignments with non-literal values, which can lead to Cross-Site Scripting (XSS). When dynamic values are assigned to these properties, an attacker can inject malicious scripts that execute in the context of the page. Use `textContent` for plain text or sanitize the input before assigning to `innerHTML`.

## Examples

Examples of *correct* code for this rule:

```js
el.innerHTML = '<div>safe</div>'
el.innerHTML = `<p>static</p>`
el.textContent = variable
```

Examples of *incorrect* code for this rule:

```js
el.innerHTML = userInput
el.outerHTML = getHtml()
el.innerHTML = data
```
