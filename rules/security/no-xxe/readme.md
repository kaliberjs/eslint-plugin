# security-no-xxe

Do not enable XML entity expansion or DTD loading.

## Why it matters

External entities permit file reads from the server (XXE) and billion-laughs denial of service. Covers libxml-js option shapes; parsers with entities off by default stay quiet.

## Incorrect

```js
parseXml(xml, { noent: true })
```

## Correct

```js
libxmljs.parseXml(xml)
```

## Limitations

Stated honestly: xml2js and other JS-native parsers that do not resolve external entities are not flagged — flagging them would be wrong rather than merely noisy.

## Prior art

SonarJS S2755, OWASP XXE Prevention Cheat Sheet

Warn level in `configs.security`; scores, sources and references in docs/research/rule-inventory.yaml.
