# No hardcoded credentials

Detects hardcoded credentials, API keys, and secrets in source code. Uses variable name heuristics (password, secret, token, apiKey, etc.) and known API key patterns (AWS, GitHub, OpenAI, Slack) to flag suspicious string literals.

## Examples

Examples of *correct* code for this rule:

```js
const password = process.env.PASSWORD
const token = generateToken()
const apiKey = config.get('apiKey')
```

Examples of *incorrect* code for this rule:

```js
const password = 'hunter2'
const secret = 'mySecretValue'
const apiKey = 'AKIAIOSFODNN7EXAMPLE'
config.token = 'hardcoded-token-value'
```
