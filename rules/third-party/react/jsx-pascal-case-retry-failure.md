# Problem
The `react/jsx-pascal-case` rule is not being triggered by the `RuleTester`, even with invalid code.

# Attempts
1. I wrote a standard test with valid and invalid cases, but the invalid cases were not flagged.
2. I corrected the error messages to match the rule's expected output, but the test still failed.
3. I added a variable declaration to the JSX code, but this did not resolve the issue.

# Possible Solution
The issue may be related to the version of `eslint-plugin-react` or its interaction with the ESLint v7 parser. It's possible that the rule is not being correctly loaded or configured by the `RuleTester`.
