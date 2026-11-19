const { test } = require('../../machinery/test')

test('security-no-pii-in-logs', {
  valid: [
    // Non-PII identifier in console.log
    `console.log(username)`,
    `console.log(status)`,
    `console.log(count)`,
    `console.log(message)`,

    // String literal (not an identifier)
    `console.log("email: test@example.com")`,

    // Number literal
    `console.log(42)`,

    // Non-log object
    `myService.log(email)`,
    `analytics.info(ssn)`,
    `tracker.warn(creditCard)`,

    // Non-log method
    `console.clear()`,
    `console.table(email)`,
    `console.assert(phone)`,
    `console.dir(address)`,

    // PII name used in non-log context
    `processData(email)`,
    `validate(ssn)`,
    `format(creditCard)`,

    // Empty call
    `console.log()`,

    // Object literal argument (not an Identifier/MemberExpression with PII name)
    `console.log({ data: value })`,

    // Template literal
    "console.log(`user info`)",

    // Computed MemberExpression (property not Identifier)
    `console.log(user["email"])`,

    // Nested call expression as argument
    `console.log(getEmail())`,

    // Arrow function argument
    `console.log(() => email)`,

    // logger with non-PII
    `logger.info(requestId)`,

    // log with non-PII
    `log.debug(traceId)`,
  ],
  invalid: [
    // console.log with email
    {
      code: `console.log(email)`,
      errors: [{ messageId: 'piiInLog' }],
    },
    // console.info with ssn
    {
      code: `console.info(ssn)`,
      errors: [{ messageId: 'piiInLog' }],
    },
    // console.warn with creditCard
    {
      code: `console.warn(creditCard)`,
      errors: [{ messageId: 'piiInLog' }],
    },
    // console.error with phone
    {
      code: `console.error(phone)`,
      errors: [{ messageId: 'piiInLog' }],
    },
    // console.debug with phoneNumber
    {
      code: `console.debug(phoneNumber)`,
      errors: [{ messageId: 'piiInLog' }],
    },
    // console.trace with address
    {
      code: `console.trace(address)`,
      errors: [{ messageId: 'piiInLog' }],
    },
    // console.log with dob
    {
      code: `console.log(dob)`,
      errors: [{ messageId: 'piiInLog' }],
    },
    // console.log with date_of_birth
    {
      code: `console.log(date_of_birth)`,
      errors: [{ messageId: 'piiInLog' }],
    },
    // console.log with dateOfBirth
    {
      code: `console.log(dateOfBirth)`,
      errors: [{ messageId: 'piiInLog' }],
    },
    // console.log with passport
    {
      code: `console.log(passport)`,
      errors: [{ messageId: 'piiInLog' }],
    },
    // console.log with national_id
    {
      code: `console.log(national_id)`,
      errors: [{ messageId: 'piiInLog' }],
    },
    // console.log with nationalId
    {
      code: `console.log(nationalId)`,
      errors: [{ messageId: 'piiInLog' }],
    },
    // console.log with bank_account
    {
      code: `console.log(bank_account)`,
      errors: [{ messageId: 'piiInLog' }],
    },
    // console.log with bankAccount
    {
      code: `console.log(bankAccount)`,
      errors: [{ messageId: 'piiInLog' }],
    },
    // console.log with social_security
    {
      code: `console.log(social_security)`,
      errors: [{ messageId: 'piiInLog' }],
    },
    // console.log with credit_card
    {
      code: `console.log(credit_card)`,
      errors: [{ messageId: 'piiInLog' }],
    },
    // console.log with phone_number
    {
      code: `console.log(phone_number)`,
      errors: [{ messageId: 'piiInLog' }],
    },
    // logger.info with email
    {
      code: `logger.info(email)`,
      errors: [{ messageId: 'piiInLog' }],
    },
    // logger.error with ssn
    {
      code: `logger.error(ssn)`,
      errors: [{ messageId: 'piiInLog' }],
    },
    // log.warn with phone
    {
      code: `log.warn(phone)`,
      errors: [{ messageId: 'piiInLog' }],
    },
    // log.debug with address
    {
      code: `log.debug(address)`,
      errors: [{ messageId: 'piiInLog' }],
    },
    // MemberExpression argument: user.email
    {
      code: `console.log(user.email)`,
      errors: [{ messageId: 'piiInLog' }],
    },
    // MemberExpression argument: data.ssn
    {
      code: `console.log(data.ssn)`,
      errors: [{ messageId: 'piiInLog' }],
    },
    // MemberExpression argument: customer.creditCard
    {
      code: `logger.warn(customer.creditCard)`,
      errors: [{ messageId: 'piiInLog' }],
    },
    // Multiple PII args in one call
    {
      code: `console.log(email, ssn, phone)`,
      errors: [
        { messageId: 'piiInLog' },
        { messageId: 'piiInLog' },
        { messageId: 'piiInLog' },
      ],
    },
    // PII mixed with non-PII args
    {
      code: `console.log("User:", email, "Status:", status)`,
      errors: [{ messageId: 'piiInLog' }],
    },
    // Case insensitive: EMAIL
    {
      code: `console.log(EMAIL)`,
      errors: [{ messageId: 'piiInLog' }],
    },
  ],
})
