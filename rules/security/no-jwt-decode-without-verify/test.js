const { test, merge } = require('../../../machinery/test')

test('security-no-jwt-decode-without-verify', merge(
  {
    valid: [
      // verify() checks the signature; that is the remediation and not flagged.
      'jwt.verify(token, key)',
      // Not a JWT decode.
      'decoder.decode(buffer)',
      'new TextDecoder().decode(bytes)',
    ],
    invalid: [
      {
        code: 'jwt.decode(token)',
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        code: 'import { jwtDecode } from "jwt-decode"; export const claims = jwtDecode(token)',
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        code: 'decodeJwt(token)',
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        code: 'jsonwebtoken.decode(req.headers.authorization.slice(7))',
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
    ],
  },

  {
    // The known legitimate uses are still reported (the rule cannot tell
    // them apart) — these pin that they are *reported*, at medium confidence,
    // so their presence stays a documented decision rather than an accident.
    valid: [],
    invalid: [
      {
        // Reading exp for refresh timing: legitimate, but the rule cannot
        // know that from syntax alone.
        code: 'const claims = decodeJwt(token); if (claims.exp < now()) refresh()',
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
    ],
  },
))
