# Detect non-literal require

Flags `require()` calls where the argument is not a static string literal. Dynamic `require()` calls can allow an attacker to load arbitrary modules, potentially leading to remote code execution.

## Examples

Examples of *correct* code for this rule:

```js
require('fs')
require('path')
require('./module')
require(`./static`)
```

Examples of *incorrect* code for this rule:

```js
require(variable)
require(getModule())
require(name + '.js')
```
