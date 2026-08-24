# security-no-jquery-html-sink

Do not pass non-literal values to jQuery HTML-parsing methods.

## Why it matters

jQuery parses markup in .html()/.append()/.wrap() and friends; a non-literal there is jQuery-era XSS. Bare $(x) is deliberately out of scope because selectors dominate that call shape - flagging it would be noise.

## Incorrect

```js
$('#out').html(userValue)
```

## Correct

```js
$('#out').text(userValue)
```

## Limitations

Stated honestly: Literal-only exemption matches the other DOM rules; computed-but-safe values flag until taint coverage reaches jQuery sinks.

## Prior art

CodeQL js/xss-through-dom, Semgrep jquery-insecure-method

Warn level in `configs.security`; scores, sources and references in docs/research/rule-inventory.yaml.
