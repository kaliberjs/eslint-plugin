# Detect unsafe regex (ReDoS)

Detects potentially unsafe regular expressions that may cause catastrophic backtracking (Regular Expression Denial of Service). This is a simplified heuristic that catches the most common patterns: nested quantifiers like `(a+)+`, `(a*)*`, `(a+)*`.

## Examples

Examples of *correct* code for this rule:

```js
/abc/
/a+b/
/(a|b)+/
new RegExp('abc')
/[a-z]+/
```

Examples of *incorrect* code for this rule:

```js
/(a+)+/
/(a+)*/
/(a*)+/
new RegExp('(a+)+')
/(x+x+)+y/
```
