# security-no-template-autoescape-disabled

Do not disable template autoescaping.

## Why it matters

One configuration line defeats the escaping every template relies on: a single unsanitized CMS or user field becomes stored XSS across the whole engine. Covers nunjucks autoescape, Handlebars noEscape/SafeString, and Angular DomSanitizer bypass methods.

## Incorrect

```js
nunjucks.configure({ autoescape: false })
```

## Correct

```js
Keep escaping on; sanitize individual trusted values at the render site.
```

## Limitations

Stated honestly: EJS <%- %> and Pug != live inside template strings ESLint does not parse; Vue v-html belongs to framework-specific rule sets. Handlebars root matching is name-based ('Handlebars').

## Prior art

SonarJS S5247 family, CWE-116

Warn level in `configs.security`; scores, sources and references in docs/research/rule-inventory.yaml.
