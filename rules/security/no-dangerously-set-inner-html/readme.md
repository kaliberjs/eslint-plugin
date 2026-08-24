# security-no-dangerously-set-inner-html

Do not use `dangerouslySetInnerHTML` with non-constant HTML.

- **OWASP:** [A03:2021 – Injection](https://owasp.org/Top10/A03_2021-Injection/)
- **CWE:** [CWE-79: Cross-site Scripting (XSS)](https://cwe.mitre.org/data/definitions/79.html)
- **Severity:** high · **Confidence:** medium

## What it detects

`dangerouslySetInnerHTML={{ __html: x }}` where `x` is not a constant — in
JSX and in `React.createElement(tag, { dangerouslySetInnerHTML: { __html: x } })`.

The attribute is a deliberate hole in React's escaping. A non-constant value
is the standard React XSS: whatever flows into it becomes executable HTML,
with no injection of tags required anywhere else.

## Why not just flag every use?

Unlike `react/no-danger`, this rule allows the **constant-only** form:

```jsx
<div dangerouslySetInnerHTML={{ __html: '<svg><use href="#icon" /></svg>' }} />
```

Icon sprites, static markup and other build-time constants are safe and
legitimate; flagging them would teach teams to disable the rule entirely.
Reserving the finding for values that could actually carry attacker
influence is what makes the rule survive contact with a real codebase.

## Why medium confidence

Sanitizer modelling (DOMPurify, sanitize-html) does not exist yet in the
shared analysis layer. Until it does, a value that merely *passed through*
a sanitizer upstream is still flagged — the known cost of this choice is
JSON-LD built at render time (`__html: JSON.stringify(jsonLd)`), which is
legitimate but syntactically indistinguishable from XSS. If you hit that,
disable on the line with a comment rather than disabling the rule.

## Correct

```js
import DOMPurify from 'dompurify'

<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(cmsHtml) }} />
// — still flagged today; sanitizer-awareness is planned for the taint layer.
// The current remediation for dynamic HTML:
<div>{parsedReactNodes}</div>
```

## Trusting your project's HTML helpers

A value that passes through a registered sanitizer stays quiet. Register
them in your project's ESLint settings — this is an explicit, reviewable
declaration that the helper is trusted:

```js
// eslint.config.js
settings: {
  '@kaliber/security': {
    registry: {
      sanitizers: [
        // A project helper whose output is trusted HTML (e.g. the i18n
        // pipeline renders sanitized rich text):
        { id: 'i18n', root: { helper: 'i18n' }, argument: 0, clears: ['html'] },

        // A library sanitizer:
        { id: 'dompurify', root: { method: 'sanitize', receiver: /^dompurify$/i }, argument: 0, clears: ['html'] },
      ],
    },
  },
}
```

The `root.helper` shape exists precisely so name-trust is a *decision*:
bare method names are still rejected at load time (the lodash-`escape`
trap), but `helper` records that you looked at this function and vouch for
it. The same registration is honored by `security-no-dom-xss-sink`.

## Limitations

- Sanitized-but-dynamic values are reported until sanitizer modelling ships.
- Template literals with interpolated expressions are non-constants even if
  every expression happens to be safe at runtime.

## Prior art

`react/no-danger`, `react/no-danger-with-children`, CodeQL `js/xss`,
Semgrep `react-dangerouslysetinnerhtml`.

## References

- [React docs: dangerouslySetInnerHTML](https://react.dev/reference/react-dom/components/common#dangerously-setting-the-inner-html)
- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
