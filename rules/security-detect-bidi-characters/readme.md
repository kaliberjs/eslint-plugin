# Detect bidirectional control characters

Detects dangerous Unicode bidirectional control characters in source code that can be used for Trojan Source attacks. These invisible characters can reorder how text is displayed, making code appear to do something different than what it actually does. This can be exploited to hide malicious logic in code that passes visual review.

## Examples

Examples of *correct* code for this rule:

```js
const x = 'hello'
// normal comment
const msg = 'שלום'
```

Examples of *incorrect* code for this rule:

```js
// Code containing U+202A (Left-to-Right Embedding)
const x = '‪'

// Code containing U+2067 (Right-to-Left Isolate)
const y = '⁧'
```
