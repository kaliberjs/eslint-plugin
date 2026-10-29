# Match media query

A media feature must be wrapped in parentheses. In the Media Queries Level 4 grammar a media feature is `( <mf-name> [ : <mf-value> ] )`, and the parentheses are part of that production. Written bare, `'prefers-reduced-motion'` or `'min-width: 48em'` is not a valid media query. It parses as an unknown media type, the query never matches, and the branch behind it silently never runs.

The rule checks the string argument of `matchMedia(…)` and `window.matchMedia(…)`. It reports a media feature name that sits outside any parentheses. When the whole query is one feature, the fix wraps it in parentheses. Otherwise the rule reports without a fix, because the intended grouping is not clear from the string alone.

Only string literals and template literals without substitutions are checked. Queries built at runtime are left alone.

## Examples

Examples of *correct* code for this rule:

```js
window.matchMedia('(prefers-reduced-motion: reduce)')
```
```js
matchMedia('screen and (min-width: 48em)')
```
```js
matchMedia('print')
```
```js
matchMedia(query)
```

Examples of *incorrect* code for this rule:

```js
window.matchMedia('prefers-reduced-motion')
```
```js
matchMedia('min-width: 48em')
```
```js
matchMedia('screen and min-width: 48em')
```
