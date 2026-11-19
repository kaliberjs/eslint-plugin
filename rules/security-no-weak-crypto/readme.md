# No weak crypto

Detects usage of weak cryptographic hash algorithms (MD5, SHA1, MD4, RIPEMD-160) that are vulnerable to collision attacks. Also flags importing known weak crypto packages.

## Examples

Examples of *correct* code for this rule:

```js
crypto.createHash('sha256')
crypto.createHash('sha512')
require('bcrypt')
import crypto from 'crypto'
```

Examples of *incorrect* code for this rule:

```js
crypto.createHash('md5')
crypto.createHash('sha1')
require('md5')
import md5 from 'md5'
```
